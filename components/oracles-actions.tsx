import React, {Fragment, useEffect, useRef, useState} from "react";
import {Spinner} from "react-bootstrap";
import {NumberFormatValues} from "react-number-format";

import BigNumber from "bignumber.js";
import {useTranslation} from "next-i18next";

import LockedIcon from "assets/icons/locked-icon";

import Button from "components/button";
import InputNumber from "components/input-number";
import Modal from "components/modal";
import NetworkTxButton from "components/network-tx-button";
import OraclesBoxHeader from "components/oracles-box-header";
import ReadOnlyButtonWrapper from "components/read-only-button-wrapper";

import {useAppState} from "contexts/app-state";

import {formatNumberToNScale, formatStringToCurrency} from "helpers/formatNumber";

import {Wallet} from "interfaces/authentication";
import {TransactionStatus} from "interfaces/enums/transaction-status";
import {TransactionTypes} from "interfaces/enums/transaction-types";

import useApi from "x-hooks/use-api";
import useERC20 from "x-hooks/use-erc20";

interface OraclesActionsProps {
  wallet: Wallet;
  updateWalletBalance: () => void;
}

function OraclesActions({
                          wallet,
  updateWalletBalance
} : OraclesActionsProps) {
  const { t } = useTranslation(["common", "my-oracles"]);

  const actions: string[] = [
    String(t("my-oracles:actions.lock.label")),
    String(t("my-oracles:actions.unlock.label"))
  ];

  const [error, setError] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [action, setAction] = useState<string>(actions[0]);
  const [tokenAmount, setTokenAmount] = useState<string>();

  const networkTxRef = useRef<HTMLButtonElement>(null);

  const networkTokenERC20 = useERC20();

  const { state: { transactions, Service }} = useAppState();

  const { processEvent } = useApi();

  const networkTokenSymbol = networkTokenERC20.symbol || t("misc.$token");
  const networkTokenDecimals = networkTokenERC20.decimals || 18;

  const exceedsAvailable = value => BigNumber(value).gt(getMaxAmount());

  const verifyTransactionState = (type: TransactionTypes): boolean =>
    !!transactions.find((transactions) =>
        transactions.type === type &&
        transactions.status === TransactionStatus.pending);

  const renderInfo = {
    Lock: {
      title: t("my-oracles:actions.lock.title", { currency: networkTokenSymbol }),
      description: 
             t("my-oracles:actions.lock.description", { 
               currency: networkTokenSymbol, 
               token: Service?.network?.networkToken?.symbol
             }),
      label: t("my-oracles:actions.lock.get-amount-oracles", {
        amount: formatNumberToNScale(tokenAmount),
        token: Service?.network?.networkToken?.symbol
      }),
      caption: (
        <>
          {t("misc.get")} <span className="text-purple">
                            {t("$oracles", { token: Service?.network?.networkToken?.symbol })}
                          </span>{" "}
          {t("misc.from")} <span className="text-primary">
            {networkTokenSymbol}
          </span>
        </>
      ),
      body: 
        t("my-oracles:actions.lock.body", { 
          amount: formatNumberToNScale(tokenAmount), 
          currency: networkTokenSymbol,
          token: Service?.network?.networkToken?.symbol
        }),
      params() {
        return { tokenAmount };
      }
    },
    Unlock: {
      title: 
        t("my-oracles:actions.unlock.title", { currency: networkTokenSymbol }),
      description: 
        t("my-oracles:actions.unlock.description", { 
          currency: networkTokenSymbol,
          token: Service?.network?.networkToken?.symbol
        }),
      label: t("my-oracles:actions.unlock.get-amount-bepro", {
        amount: formatNumberToNScale(tokenAmount),
        currency: networkTokenSymbol,
        token: Service?.network?.networkToken?.symbol
      }),
      caption: (
        <>
          {t("misc.get")} <span className="text-primary">
            { networkTokenSymbol}</span>{" "}
          {t("misc.from")} <span className="text-purple">
                            {t("$oracles", { token: Service?.network?.networkToken?.symbol })}
                           </span>
        </>
      ),
      body: t("my-oracles:actions.unlock.body", { 
        amount: formatNumberToNScale(tokenAmount),
        currency: networkTokenSymbol,
        token: Service?.network?.networkToken?.symbol
      }),
      params(from: string) {
        return { tokenAmount, from };
      }
    }
  }[action];

  const isButtonDisabled = (): boolean =>
    [
      action === t("my-oracles:actions.lock.label") && needsApproval(),
      !wallet?.address,
      BigNumber(tokenAmount).isZero(),
      BigNumber(tokenAmount).isNaN(),
      exceedsAvailable(tokenAmount),
      !tokenAmount,
      transactions.find(({ status, type }) =>
          status === TransactionStatus.pending && type === getTxType())
    ].some((values) => values);

  function handleCheck() {
    if (!tokenAmount) {
      return setError(t("my-oracles:errors.amount-higher-0", {
        currency: networkTokenSymbol
      }));
    }
    const isChecked = !needsApproval();
    setShow(isChecked);
    setError(!isChecked ? t("my-oracles:errors.approve-transactions", { currency: networkTokenSymbol }) : "")
  }

  function onSuccess() {
    setError("");
    setTokenAmount("");
    updateWalletBalance();
    networkTokenERC20.updateAllowanceAndBalance();
  }

  function handleProcessEvent(blockNumber) {
    processEvent("oracles",
                 "changed",
                 Service?.network?.lastVisited,
      { fromBlock: blockNumber }).catch(console.debug);
  }

  function handleChangeToken(params: NumberFormatValues) {
    if (error) setError("");

    if (params.value === "") return setTokenAmount(undefined);

    if (exceedsAvailable(params.value))
      setError(t("my-oracles:errors.amount-greater", { amount: getCurrentLabel() }));

    setTokenAmount(params.value);
  }

  function handleConfirm() {
    setShow(false);
    networkTxRef?.current?.click();
  }

  function handleCancel() {
    setTokenAmount("0");
    setShow(false);
  }

  function approveSettlerToken() {
    setIsApproving(true);

    networkTokenERC20.approve(tokenAmount)
     .finally(() => setIsApproving(false));
  }

  function getCurrentLabel() {
    return action === t("my-oracles:actions.lock.label")
      ? networkTokenSymbol
      : t("$oracles", { token: Service?.network?.networkToken?.symbol });
  }

  function getMaxAmount(trueValue = false): string {
    const amount = action === t("my-oracles:actions.lock.label")
      ? wallet?.balance?.bepro?.toFixed()
      : wallet?.balance?.oracles?.locked?.toFixed();

    if (!amount)
      return '0';

    if (trueValue)
      return amount;

    return formatNumberToNScale(amount);
  }

  function setMaxAmount() {
    return setTokenAmount(getMaxAmount(true));
  }

  function getTxType() {
    return action === t("my-oracles:actions.lock.label")
      ? TransactionTypes.lock
      : TransactionTypes.unlock;
  }

  const needsApproval = () => 
    networkTokenERC20.allowance.isLessThan(tokenAmount) && action === t("my-oracles:actions.lock.label");

  useEffect(() => {
    if (Service?.active?.network?.networkToken?.contractAddress)
      networkTokenERC20.setAddress(Service?.active?.network?.networkToken?.contractAddress);
  }, [Service?.active?.network?.networkToken?.contractAddress]);

  return (
    <>
      <div className="col-md-6">
        <div className="content-wrapper h-100">
          <OraclesBoxHeader
            actions={actions}
            onChange={setAction}
            currentAction={action}
          />

          <p className="caption-small text-white text-uppercase mt-2 mb-3">
            {renderInfo?.description}
          </p>

          <InputNumber
            disabled={!wallet?.address}
            label={t("my-oracles:fields.amount.label", {
              currency: getCurrentLabel()
            })}
            symbol={`${getCurrentLabel()}`}
            classSymbol={`${
              getCurrentLabel() === t("$oracles", { token: Service?.network?.networkToken?.symbol })
                ? "text-purple"
                : "text-primary"
            }`}
            max={wallet?.balance?.bepro?.toFixed()}
            error={!!error}
            value={tokenAmount}
            min={0}
            placeholder={t("my-oracles:fields.amount.placeholder", {
              currency: getCurrentLabel()
            })}
            onValueChange={handleChangeToken}
            thousandSeparator
            decimalSeparator="."
            allowNegative={false}
            decimalScale={networkTokenDecimals}
            helperText={
              <>
                {formatStringToCurrency(getMaxAmount())}{" "}
                {getCurrentLabel()} {t("misc.available")}
                <span onClick={setMaxAmount}
                      className={`caption-small ml-1 cursor-pointer text-uppercase ${(
                        getCurrentLabel() === t("$oracles", { token: Service?.network?.networkToken?.symbol }) 
                          ? "text-purple" 
                          : "text-primary"
                      )}`}>
                  {t("misc.max")}
                </span>
                {error && <p className="p-small my-2">{error}</p>}
              </>
            }
          />

          <ReadOnlyButtonWrapper>
            <div className="mt-5 d-grid gap-3">
              {action === t("my-oracles:actions.lock.label") && (
                <Button
                  disabled={!needsApproval() || isApproving}
                  className="ms-0 read-only-button"
                  onClick={approveSettlerToken}
                >
                  {!needsApproval() && (
                    <LockedIcon width={12} height={12} className="mr-1" />
                  )}
                  <span>
                    {t("actions.approve")}{" "}
                    {wallet?.address &&
                    verifyTransactionState(TransactionTypes.approveSettlerToken) ? (
                      <Spinner
                        size={"xs" as unknown as "sm"}
                        className="align-self-center ml-1"
                        animation="border"
                      />
                    ) : (
                      ""
                    )}
                  </span>
                </Button>
              )}

              <Button
                color={
                  action === t("my-oracles:actions.lock.label")
                    ? "purple"
                    : "primary"
                }
                className="ms-0 read-only-button"
                disabled={isButtonDisabled()}
                onClick={handleCheck}
              >
                {isButtonDisabled() && (
                  <LockedIcon width={12} height={12} className="mr-1" />
                )}
                <span>{renderInfo?.label}</span>
              </Button>
            </div>
          </ReadOnlyButtonWrapper>

          <NetworkTxButton
            txMethod={action.toLowerCase()}
            txType={getTxType()}
            txCurrency={getCurrentLabel()}
            handleEvent={handleProcessEvent}
            txParams={renderInfo?.params(wallet?.address)}
            buttonLabel=""
            modalTitle={renderInfo?.title}
            modalDescription={renderInfo?.description}
            onSuccess={onSuccess}
            onFail={setError}
            ref={networkTxRef}
          />
        </div>
      </div>

      <Modal
        title={renderInfo?.title}
        show={show}
        titlePosition="center"
        onCloseClick={handleCancel}
        footer={
          <div className="d-flex justify-content-between">
            <Button color="dark-gray" onClick={handleCancel}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleConfirm}>{t("actions.confirm")}</Button>
          </div>
        }
      >
        <p className="caption-small text-uppercase text-center mb-2">
          {renderInfo?.caption}
        </p>
        <p className="text-center h4">
          {renderInfo?.body?.split("/").map((sentence: string) => {
            const Component =
              ((sentence.startsWith("oracles") ||
                sentence.startsWith("bepro")) &&
                "span") ||
              Fragment;

            return (
              <Fragment key={sentence}>
                <Component
                  {...(sentence.startsWith("oracles") && {
                    className: "text-purple"
                  })}
                  {...(sentence.startsWith("bepro") && {
                    className: "text-primary"
                  })}
                >
                  {sentence.replace(/bepro|oracles|br/, "")}
                </Component>
                {sentence.startsWith("br") && <br />}
              </Fragment>
            );
          })}
        </p>
      </Modal>
    </>
  );
}

export default OraclesActions;

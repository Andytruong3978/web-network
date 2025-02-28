import {useEffect, useState} from "react";

import BigNumber from "bignumber.js";
import {format} from "date-fns";
import {useTranslation} from "next-i18next";

import ArrowRight from "assets/icons/arrow-right";
import CopyIcon from "assets/icons/copy";
import LinkIcon from "assets/icons/link-icon";

import Button from "components/button";
import InternalLink from "components/internal-link";
import Modal from "components/modal";
import TransactionStats from "components/transaction-stats";

import {useAppState} from "contexts/app-state";
import {toastInfo} from "contexts/reducers/change-toaster";

import {CopyValue} from "helpers/copy-value";
import {formatStringToCurrency} from "helpers/formatNumber";
import {truncateAddress} from "helpers/truncate-address";

import {BlockTransaction, Transaction} from "interfaces/transaction";

import {useNetwork} from "x-hooks/use-network";

export default function TransactionModal({
                                           transaction = null,
                                           onCloseClick,
                                         }: {
  transaction: Transaction;
  onCloseClick: () => void;
}) {
  const { t } = useTranslation("common");
  
  const [details, setDetails] = useState<any>([]);  // eslint-disable-line
  const [addressTo, setAddressTo] = useState("...");
  const [addressFrom, setAddressFrom] = useState("...");

  const { state, dispatch } = useAppState();

  const { getURLWithNetwork } = useNetwork();

  function updateAddresses() {
    if (!transaction) return;

    const blockTransaction = transaction as BlockTransaction;

    setAddressFrom(truncateAddress(blockTransaction?.addressFrom, 12, 3, "..."));
    setAddressTo(truncateAddress(blockTransaction?.addressTo, 12, 3, "..."));

    const makeDetail = (span, content) => ({ span, content });
    setDetails([
      makeDetail(t("transactions.amount"),
                 <>
          <span>{formatStringToCurrency(BigNumber(blockTransaction?.amount || 0).toFixed())}</span>{" "}
          <span
            className={`${
              blockTransaction?.currency?.toLowerCase() === "oracles"
                ? "text-purple"
                : "text-primary"
            }`}
          >
            {blockTransaction?.currency}
          </span>{" "}
        </>),
      makeDetail(t("transactions.confirmations"),
                 [blockTransaction?.confirmations, 23].join("/")),
      makeDetail(t("transactions.date"),
                 format(new Date(blockTransaction?.date), "MMMM dd yyyy hh:mm:ss a"))
    ]);
  }

  useEffect(updateAddresses, [transaction]);

  function renderDetailRow(item, index): any {  // eslint-disable-line
    return (
      <div 
        className="d-flex align-items-center justify-content-between bg-dark-gray py-2 mt-2 px-3 rounded-8" 
        key={`${item.span}${index}`}
      >
        <span className="caption-small text-white-50">{item.span}</span>
        <span className="caption-medium text-white">{item.content}</span>
      </div>
    );
  }

  function copyValue(value: string) {
    CopyValue(value);
    dispatch(toastInfo(t("transactions.copied", { value })));
  }

  function getTransactionId() {
    return (transaction as BlockTransaction)?.transactionHash;
  }

  function hasTransactionId() {
    return transaction && !!(transaction as BlockTransaction).transactionHash;
  }

  function getEtherScanHref(tx: string) {
    return `${state.Settings?.urls?.blockScan}/${tx}`;
  }

  return (
    <>
      <Modal
        id="transaction-modal"
        title={t("transactions.modal")}
        show={!!transaction}
        onCloseClick={onCloseClick}
        titlePosition="center"
        titleClass="h3 text-white bg-opacity-100 fs-2"
      >
        <span className="d-block caption-small text-white-50 text-uppercase">
          {t("misc.status")}
        </span>
        <div className="d-flex justify-content-between align-items-center py-2">
          <TransactionStats status={transaction?.status} />

          <div className="d-flex">
            {(hasTransactionId() && (
              <Button
                onClick={() => copyValue(getTransactionId())}
                className="border-dark-gray mr-1 hover-blue"
                applyTextColor={false}
                transparent
                rounded
              >
                <CopyIcon />
              </Button>
            )) ||
              ""}
            <a
              href={getEtherScanHref(getTransactionId())}
              className="text-decoration-none"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                className="border-dark-gray mr-1 hover-blue not-svg"
                applyTextColor={false}
                transparent
                rounded
              >
                <LinkIcon width="9.33" height="9.33" />
              </Button>
            </a>
          </div>
        </div>

        <div className="caption-small d-flex flex-row mb-3">
          <span className="text-light-gray">{t("misc.on")}</span>
          <InternalLink
            className={`${ transaction?.network?.isDefault ? "text-primary" : "" } p-0 ml-1`}
            label={transaction?.network?.name}
            href={getURLWithNetwork("/", {
              network: transaction?.network?.name
            })}
            style={{ color: `${transaction?.network?.colors?.primary}` }}
            brand
            transparent
          />
        </div>

        <div className="d-flex py-2 mb-3 caption-small text-white bg-opacity-100">
          <span>
            {t("misc.from")}: {addressFrom}
          </span>
          <div className="mx-auto">
            <ArrowRight />
          </div>
          <span>
            {t("misc.to")}: {addressTo}
          </span>
        </div>
        {details.map(renderDetailRow)}
      </Modal>
    </>
  );
}

import React, {useEffect, useState} from "react";

import BigNumber from "bignumber.js";
import {useTranslation} from "next-i18next";
import {serverSideTranslations} from "next-i18next/serverSideTranslations";
import {useRouter} from "next/router";
import {GetServerSideProps} from "next/types";

import ConnectWalletButton from "components/connect-wallet-button";
import CustomContainer from "components/custom-container";
import NotMergeableModal from "components/not-mergeable-modal";
import ProposalActionCard from "components/proposal-action-card";
import ProposalHero from "components/proposal-hero";
import ProposalListDistribution from "components/proposal-list-distribution";
import ProposalProgress from "components/proposal-progress";
import ProposalPullRequestDetail from "components/proposal-pullrequest-details";


import {useAppState} from "contexts/app-state";
import {addToast} from "contexts/reducers/change-toaster";

import calculateDistributedAmounts from "helpers/calculateDistributedAmounts";


import {ProposalExtended} from "interfaces/bounty";
import {MetamaskErrors} from "interfaces/enums/Errors";
import {pullRequest} from "interfaces/issue-data";
import {DistributedAmounts, Proposal} from "interfaces/proposal";

import useApi from "x-hooks/use-api";
import useBepro from "x-hooks/use-bepro";

import {ProposalDisputes} from "../../components/proposal-disputes";
import {BountyEffectsProvider} from "../../contexts/bounty-effects";
import {useBounty} from "../../x-hooks/use-bounty";


const defaultAmount = {
  value: "0",
  percentage: "0",
};

export default function PageProposal() {
  useBounty();
  const router = useRouter();
  const {t} = useTranslation();

  const { dispatch, state } = useAppState();
  
  const [proposal, setProposal] = useState<Proposal>({} as Proposal);
  const [pullRequest, setPullRequest] = useState<pullRequest>({} as pullRequest);
  const [networkProposal, setNetworkProposal] = useState<ProposalExtended>({} as ProposalExtended);

  const [distributedAmounts, setDistributedAmounts] =
    useState<DistributedAmounts>({
      treasuryAmount: defaultAmount,
      mergerAmount: defaultAmount,
      proposerAmount: defaultAmount,
      proposals: [],
    });
  
  const {getChainBounty, getDatabaseBounty} = useBounty();
  const { getUserOf, processEvent, createNFT } = useApi();

  const { handlerDisputeProposal, handleCloseIssue, handleRefuseByOwner } = useBepro();

  const amountTotal = 
    BigNumber.maximum(state.currentBounty?.data?.amount || 0, state.currentBounty?.data?.fundingAmount || 0);
    
  async function closeIssue() {
    try{
      if (!state.currentUser?.walletAddress) return;

      const { url } =
        await createNFT(state.currentBounty?.data?.contractId, proposal.contractId, state.currentUser?.walletAddress);
      
      handleCloseIssue(+state.currentBounty?.data?.contractId, +proposal.contractId, url)
        .then(async txInfo => {
          const { blockNumber: fromBlock } = txInfo as { blockNumber: number };
          
          await processEvent("bountyToken", "transfer", state.Service?.network?.lastVisited, { fromBlock } )
          return processEvent("bounty", "closed", state.Service?.network?.lastVisited, { fromBlock } );
        })
        .then(() => {
          getChainBounty(true);
          getDatabaseBounty(true);
          dispatch(addToast({
              type: "success",
              title: t("actions.success"),
              content: t("modals.not-mergeable.success-message")
          }));
        })
    }
    catch(error){
      if (error?.code === MetamaskErrors.UserRejected) return;

      console.log("Failed to close bounty", error);

      dispatch(addToast({
            type: "danger",
            title: t("actions.failed"),
            content: error?.response?.data?.message
      }))}
  }

  async function disputeProposal() {
    return handlerDisputeProposal(+proposal?.contractId)
      .then(txInfo => {
        const { blockNumber: fromBlock } = txInfo as { blockNumber: number };

        return processEvent("proposal", "disputed", state.Service?.network?.lastVisited, { fromBlock } );
      })
      .then(() => {
        getDatabaseBounty(true);
        getChainBounty(true);
      })
      .catch(error => {
        if (error?.code === MetamaskErrors.UserRejected) return;

        console.log("Failed to dispute proposal", error);

        dispatch(addToast({
            type: "danger",
            title: t("actions.failed"),
            content: error?.response?.data?.message
        }));
      });
  }

  async function handleRefuse() {
    return handleRefuseByOwner(+state.currentBounty?.data?.contractId, +proposal.contractId)
    .then(txInfo => {
      const { blockNumber: fromBlock } = txInfo as { blockNumber: number };

      return processEvent("proposal", "refused", state.Service?.network?.lastVisited, { fromBlock } );
    })
    .then(() => {
      getDatabaseBounty(true);
      getChainBounty(true);
      
      dispatch(addToast({
        type: "success",
        title: t("actions.success"),
        content: t("proposal:messages.proposal-refused")
      }));
    })
    .catch(error => {
      if (error?.code === MetamaskErrors.UserRejected) return;
      
      console.log("Failed to refuse proposal", error);

      dispatch(addToast({
          type: "danger",
          title: t("actions.failed"),
          content: error?.response?.data?.message
      }));
    });
  }

  async function getDistributedAmounts() {
    if (!networkProposal?.details || !state?.Service?.network?.amounts) return;
    
    const { treasury, mergeCreatorFeeShare, proposerFeeShare } = state.Service.network.amounts;

    const distributions = calculateDistributedAmounts(treasury,
                                                      mergeCreatorFeeShare,
                                                      proposerFeeShare,
                                                      amountTotal,
                                                      networkProposal.details);

    Promise.all(distributions.proposals.map(async({recipient, ...rest}) => {
      let githubLogin = null

      try {
        const user = await getUserOf(recipient);
        githubLogin = user.githubLogin;
      } catch (error) {
        console.error(error)
      }
      return  {...rest, recipient, githubLogin}
    })).then(proposals => setDistributedAmounts({...distributions, proposals}))
  }

  useEffect(() => {
    if (!networkProposal?.details?.length) return;
    getDistributedAmounts();
  }, [networkProposal, state?.Service?.network?.amounts]);

  useEffect(() => {
    if (!state.currentBounty?.data || !state.currentBounty?.chainData) return;

    const { proposalId } = router.query;

    const mergeProposal = state.currentBounty?.data?.mergeProposals?.find((p) => +p.id === +proposalId);
    const networkProposals = state.currentBounty?.chainData?.proposals?.[+mergeProposal?.contractId];
    const pullRequest = state.currentBounty?.data?.pullRequests.find((pr) => pr.id === mergeProposal?.pullRequestId);

    setProposal(mergeProposal);
    setPullRequest(pullRequest);
    setNetworkProposal(networkProposals);
  }, [router.query, state.currentBounty?.data, state.currentBounty?.chainData]);

  return (
    <BountyEffectsProvider>
      <ProposalHero proposal={proposal} />

      <CustomContainer>
        <div className="mt-3 bg-shadow rounded-5 p-3 d-flex flex-column">
          <ProposalPullRequestDetail
            currentPullRequest={pullRequest}
          />
          <ProposalProgress distributedAmounts={distributedAmounts} />
        </div>
        <div className="mt-3 row justify-content-between">
          <div className="col-md-6">
          <div className="p-3 bg-gray-900 d-flex align-item-center rounded-top">
            <h4 className="text-uppercase caption-medium text-gray">{t("proposal:addresses_for_the_distribution")}</h4>
          </div>
          <ProposalListDistribution distributedAmounts={distributedAmounts} />
          </div>
          <ProposalActionCard
            proposal={proposal}
            networkProposal={networkProposal}
            currentPullRequest={pullRequest}
            onMerge={closeIssue}
            onDispute={disputeProposal}
            onRefuse={handleRefuse}
            distributedAmounts={distributedAmounts}
          />
        </div>
        <ProposalDisputes proposalId={proposal?.id} />
      </CustomContainer>

      <NotMergeableModal
        pullRequest={pullRequest}
        proposal={proposal}
        networkProposal={networkProposal}
      />

      <ConnectWalletButton asModal={true} />
    </BountyEffectsProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        "common",
        "bounty",
        "proposal",
        "pull-request",
        "connect-wallet-button"
      ]))
    }
  };
};

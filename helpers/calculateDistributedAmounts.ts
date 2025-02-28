import { ProposalDetail } from "@taikai/dappkit";
import { Defaults } from "@taikai/dappkit";
import BigNumber from "bignumber.js";

import { DistributedAmounts } from "interfaces/proposal";

const bigNumberPercentage = 
  (value1: BigNumber, value2: BigNumber) => value1.dividedBy(value2).multipliedBy(100).toFixed(2);


export default function calculateDistributedAmounts(treasury,
                                                    mergerFee: string | number,
                                                    proposerFee: string | number,
                                                    bountyAmount: BigNumber,
                                                    proposalPercents: ProposalDetail[]): DistributedAmounts {
  let treasuryAmount = BigNumber(0);
  
  if (treasury.treasury && treasury.treasury !== Defaults.nativeZeroAddress)
    treasuryAmount = bountyAmount.dividedBy(100).multipliedBy(treasury.closeFee);

  const realAmount = bountyAmount.minus(treasuryAmount);

  const mergerAmount =  realAmount.dividedBy(100).multipliedBy(mergerFee);
  const proposerAmount = realAmount.minus(mergerAmount).dividedBy(100).multipliedBy(proposerFee);
  const amount = realAmount.minus(mergerAmount).minus(proposerAmount);

  return {
    treasuryAmount: {
      value: treasuryAmount.toFixed(),
      percentage: bigNumberPercentage(treasuryAmount, bountyAmount),
    },
    mergerAmount: {
      value: mergerAmount.toFixed(),
      percentage: bigNumberPercentage(mergerAmount, bountyAmount),
    },
    proposerAmount: {
      value: proposerAmount.toFixed(),
      percentage: bigNumberPercentage(proposerAmount, bountyAmount),
    },
    proposals: proposalPercents.map(({percentage, recipient}) => {
      const value = amount.dividedBy(100).multipliedBy(percentage);
      return {
        value: value.toFixed(),
        recipient,
        percentage: bigNumberPercentage(value, bountyAmount),
      }
    }),
  };
}

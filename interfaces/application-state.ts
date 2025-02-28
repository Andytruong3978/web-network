import {Dispatch} from "react";

import { TreasuryInfo } from "@taikai/dappkit";

import {XReducerAction} from "../contexts/reducers/reducer";
import DAO from "../services/dao-service";
import {SettingsType} from "../types/settings";
import {Balance} from "./balance-state";
import {BountyExtended} from "./bounty";
import {BranchesList} from "./branches-list";
import {IssueBigNumberData, IssueDataComment} from "./issue-data";
import {LoadingState} from "./loading-state";
import {Network} from "./network";
import {ForkInfo, ForksList, RepoInfo, ReposList} from "./repos-list";
import {ToastNotification} from "./toast-notification";
import {Token} from "./token";
import {BlockTransaction, SimpleBlockTransactionPayload, UpdateBlockTransaction} from "./transaction";

export interface ServiceNetworkReposActive extends RepoInfo {
  forks?: ForkInfo[];
  branches?: string[];
  ghVisibility?: boolean;
  githubPath: string;
  id: number;
}

export interface ServiceNetworkRepos {
  list: ReposList;
  forks: ForksList | null;
  branches: BranchesList | null;
  active: ServiceNetworkReposActive | null;
}

export interface NetworkTimes {
  disputableTime: string|number;
  draftTime: string|number;
}

export interface NetworkAmounts {
  councilAmount: string | number;
  mergeCreatorFeeShare: string | number;
  proposerFeeShare: string | number;
  percentageNeededForDispute: string | number;
  oracleExchangeRate: string | number;
  treasury: TreasuryInfo;
}

export interface ServiceNetwork {
  lastVisited: string;
  active: Network | null;
  repos: ServiceNetworkRepos | null;
  networkToken: Token;
  times: NetworkTimes;
  amounts: NetworkAmounts;
  noDefaultNetwork?: boolean;
  tokens: {transactional: Token[]; reward: Token[];} | null;
}

export interface ServiceState {
  starting: boolean;
  microReady: boolean | null;
  active: DAO | null;
  network: ServiceNetwork | null;
}

export interface ConnectedChain {
  id: string;
  name: string
}

export interface CurrentUserState {
  handle: string;
  walletAddress: string;
  match?: boolean | undefined;
  balance?: Balance | null;
  login?: string;
  accessToken?: string;
  connected?: boolean;
}

export interface CurrentBounty {
  comments: IssueDataComment[];
  lastUpdated: number;
  data: IssueBigNumberData;
  chainData: BountyExtended;
}

export interface State {
  Settings: SettingsType | null;
  Service: ServiceState | null,
  loading: LoadingState | null;
  toaster: ToastNotification[];
  transactions: (SimpleBlockTransactionPayload | BlockTransaction | UpdateBlockTransaction)[];
  currentUser: CurrentUserState | null,
  connectedChain: ConnectedChain | null,
  currentBounty: CurrentBounty | null,
  show: {
    [key: string]: boolean;
  }
  spinners: {
    [key: string]: boolean;
  }
}

export interface AppState {
  state: State,
  dispatch: (action: XReducerAction<any>) => Dispatch<XReducerAction<any>>;
}
import React, {useEffect, useRef, useState} from "react";
import {FormControl, InputGroup} from "react-bootstrap";
import {isMobile} from "react-device-detect";

import {useTranslation} from "next-i18next";
import {useRouter} from "next/router";
import {UrlObject} from "url";

import CloseIcon from "assets/icons/close-icon";
import SearchIcon from "assets/icons/search-icon";

import Button from "components/button";
import CustomContainer from "components/custom-container";
import InfiniteScroll from "components/infinite-scroll";
import IssueFilters from "components/issue-filters";
import IssueListItem from "components/issue-list-item";
import ListSort from "components/list-sort";
import NothingFound from "components/nothing-found";
import ReadOnlyButtonWrapper from "components/read-only-button-wrapper";
import ScrollTopButton from "components/scroll-top-button";

import {useAppState} from "contexts/app-state";
import {changeLoadState} from "contexts/reducers/change-load";
import {changeShowCreateBounty} from "contexts/reducers/update-show-prop";

import { isProposalDisputable } from "helpers/proposal";

import {IssueBigNumberData, IssueState} from "interfaces/issue-data";

import useApi from "x-hooks/use-api";
import usePage from "x-hooks/use-page";
import useSearch from "x-hooks/use-search";

type Filter = {
  label: string;
  value: string;
  emptyState: string;
};

type FiltersByIssueState = Filter[];

interface ListIssuesProps {
  creator?: string;
  redirect?: string | UrlObject;
  filterState?: IssueState;
  emptyMessage?: string;
  buttonMessage?: string;
  pullRequesterLogin?: string;
  pullRequesterAddress?: string;
  proposer?: string;
  disputableFilter?: "dispute" | "merge";
}

interface IssuesPage {
  page: number;
  issues: IssueBigNumberData[];
}

export default function ListIssues({
  creator,
  filterState,
  emptyMessage,
  buttonMessage,
  pullRequesterLogin,
  pullRequesterAddress,
  proposer,
  redirect,
  disputableFilter
}: ListIssuesProps) {
  const {dispatch, state: appState} = useAppState();

  const router = useRouter();
  const { t } = useTranslation(["common", "bounty"]);

  const { search, setSearch, clearSearch } = useSearch();
  
  const [hasMore, setHasMore] = useState(false);
  const [searchState, setSearchState] = useState(search);
  const [truncatedData, setTruncatedData] = useState(false);
  const [issuesPages, setIssuesPages] = useState<IssuesPage[]>([]);

  const searchTimeout = useRef(null);

  const { searchIssues } = useApi();
  const { page, nextPage, goToFirstPage } = usePage();

  const isProfilePage = router?.asPath?.includes("profile");

  const { repoId, time, state, sortBy, order } = router.query as {
    repoId: string;
    time: string;
    state: string;
    sortBy: string;
    order: string;
  };

  const filtersByIssueState: FiltersByIssueState = [
    {
      label: t("filters.bounties.all"),
      value: "all",
      emptyState: t("filters.bounties.not-found")
    },
    {
      label: t("filters.bounties.open"),
      value: "open",
      emptyState: t("filters.bounties.open-not-found")
    },
    {
      label: t("filters.bounties.draft"),
      value: "draft",
      emptyState: t("filters.bounties.draft-not-found")
    },
    {
      label: t("filters.bounties.closed"),
      value: "closed",
      emptyState: t("filters.bounties.closed-not-found")
    }
  ];

  const [filterByState,] = useState<Filter>(filtersByIssueState[0]);

  function isListEmpy(): boolean {
    return issuesPages.every((el) => el.issues?.length === 0);
  }

  function hasFilter(): boolean {
    return !!(state || time || repoId || search);
  }

  function showClearButton(): boolean {
    return search.trim() !== "";
  }

  function handleClearSearch(): void {
    setSearchState("");
    clearSearch();
  }

  async function disputableFilterFn(bounties: IssueBigNumberData[]): Promise<IssueBigNumberData[]> {
    const bountiesIds = 
      (await Promise.all(bounties.map(async ({ contractId, mergeProposals}) => {
        const proposals = [];

        for await (const proposal of mergeProposals) {
          const isDisputed = await appState.Service?.active?.isProposalDisputed(contractId, proposal.contractId);
          const isDisputable = isProposalDisputable(proposal?.createdAt, 
                                                    +appState.Service?.network?.times?.disputableTime, 
                                                    await appState.Service?.active.getTimeChain());
          
          if (disputableFilter === "merge" && !isDisputed && !isDisputable) proposals.push(proposal);
          else if (disputableFilter === "dispute" && !isDisputed && isDisputable) proposals.push(proposal);
        }

        return { contractId, status: !!proposals.length };
      })))
        .filter(({ status }) => status)
        .map(({ contractId }) => contractId);

    return bounties.filter(({ contractId }) => bountiesIds.includes(contractId));
  }

  function handlerSearch() {
    if (!appState.Service?.network?.active?.name) return;

    dispatch(changeLoadState(true));

    searchIssues({
      page,
      repoId,
      time,
      state: filterState || state,
      search,
      sortBy,
      order,
      creator,
      pullRequesterLogin,
      pullRequesterAddress,
      proposer,
      networkName: appState.Service?.network?.active?.name
    })
      .then(async ({ rows, pages, currentPage }) => {
        const issues = disputableFilter ? await disputableFilterFn(rows) : rows;

        if (currentPage > 1) {
          if (issuesPages.find((el) => el.page === currentPage)) return;

          const tmp = [...issuesPages, { page: currentPage, issues }];

          tmp.sort((pageA, pageB) => {
            if (pageA.page < pageB.page) return -1;
            if (pageA.page > pageB.page) return 1;

            return 0;
          });
          setIssuesPages(tmp);
        } else {
          setIssuesPages([{ page: currentPage, issues }]);
        }

        setHasMore(currentPage < pages);
      })
      .catch((error) => {
        console.error("Error fetching issues", error);
      })
      .finally(() => {
        dispatch(changeLoadState(false));
      });
  }

  function handleSearch(event) {
    if (event.key !== "Enter") return;

    setSearch(searchState);
  }

  function handleNotFoundClick() {
    if (!redirect) return dispatch(changeShowCreateBounty(true));

    router.push(redirect);
  }

  useEffect(() => {
    if (page) {
      const pagesToValidate = [...Array(+page).keys()].map((i) => i + 1);

      setTruncatedData(!pagesToValidate.every((pageV) =>
          issuesPages.find((el) => el.page === pageV)));
    }
  }, [page, issuesPages]);

  useEffect(handlerSearch, [
    page,
    search,
    repoId,
    time,
    state,
    sortBy,
    order,
    creator,
    proposer,
    appState.Service?.network?.active?.name
  ]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);

    searchTimeout.current =  setTimeout(() => {
      setSearch(searchState);
    }, 1000);

    return () => clearTimeout(searchTimeout.current);
  }, [searchState]);

  
  function isRenderFilter() {
    if(isMobile) return false

    return (!isListEmpy() || (isListEmpy() && hasFilter()))
  }

  return (
    <CustomContainer 
      className={isProfilePage && "px-0 mx-0" || ""}
      childWrapperClassName={isProfilePage && "justify-content-left" || ""}
    >
      {isRenderFilter() ? (
        <div
          className={"d-flex align-items-center gap-20 list-actions sticky-top"}
        >
          <div className="w-100">
            <InputGroup className="border-radius-8">
              <InputGroup.Text className="cursor-pointer" onClick={handlerSearch}>
                <SearchIcon />
              </InputGroup.Text>

              <FormControl
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                className="p-2"
                placeholder={t("bounty:search")}
                onKeyDown={handleSearch}
              />

              {showClearButton() && (
                <button
                  className="btn bg-black border-0 py-0 px-3"
                  onClick={handleClearSearch}
                >
                  <CloseIcon width={10} height={10} />
                </button>
              )}
            </InputGroup>
          </div>

          <div className="d-flex align-items-center">
            <span className="caption-small text-white-50 text-nowrap mr-1">
              {t("sort.label")}
            </span>

            <ListSort
              options={[
                {
                  value: "newest",
                  sortBy: "createdAt",
                  order: "DESC",
                  label: t("sort.types.newest")
                },
                {
                  value: "oldest",
                  sortBy: "createdAt",
                  order: "ASC",
                  label: t("sort.types.oldest")
                },
                {
                  value: "highest-bounty",
                  sortBy: "amount,fundingAmount",
                  order: "DESC",
                  label: t("sort.types.highest-bounty")
                },
                {
                  value: "lowest-bounty",
                  sortBy: "amount,fundingAmount",
                  order: "ASC",
                  label: t("sort.types.lowest-bounty")
                }
              ]}
            />
          </div>

          {!filterState && <IssueFilters />}
        </div>
      ) : (
        ""
      )}

      {(truncatedData && (
        <div className="row justify-content-center mb-3 pt-5">
          <div className="d-flex col-6 align-items-center justify-content-center">
            <span className="caption-small mr-1">
              {t("errors.results-truncated")}
            </span>
            <Button onClick={goToFirstPage}>{t("actions.back-to-top")}</Button>
          </div>
        </div>
      )) || <></>}

      {issuesPages.every((el) => el.issues?.length === 0) &&
      !appState.loading?.isLoading ? (
        <div className="pt-4">
          <NothingFound description={emptyMessage || filterByState.emptyState}>
            {appState.currentUser?.walletAddress && (
              <ReadOnlyButtonWrapper>
                <Button onClick={handleNotFoundClick}>
                  {buttonMessage || String(t("actions.create-one"))}
                </Button>
                </ReadOnlyButtonWrapper>
              )}
          </NothingFound>
        </div>
      ) : null}

      {(issuesPages.some((el) => el.issues?.length > 0) && (
        <InfiniteScroll
          handleNewPage={nextPage}
          isLoading={appState.loading?.isLoading}
          hasMore={hasMore}>
          {issuesPages.map(({ issues }) => {
            return issues?.map((issue) => (
              <IssueListItem issue={issue} key={`${issue.repository_id}/${issue.githubId}`} />
            ));
          })}
        </InfiniteScroll>
      )) || <></>}

      <ScrollTopButton />
    </CustomContainer>
  );
}

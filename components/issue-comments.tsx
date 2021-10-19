import { GetStaticProps } from "next";
import { formatDate } from '@helpers/formatDate';
import MarkedRender from '@components/MarkedRender';
import Button from "./button";
import LinkIcon from "@assets/icons/link-icon";

export default function IssueComments({ comments, repo, issueId }) {
  const replyRef = comments?.length > 0 && comments[0]?.html_url || `https://github.com/${repo}/issues/${issueId}`
  return (
    <div className="container mb-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="content-wrapper">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="smallCaption mb-0">{comments?.length} comments</h3>
                <a href={replyRef} className="text-decoration-none text-uppercase fs-smallest text-center d-flex justify-content-center align-items-center" target="_blank">
                    Reply on github <LinkIcon className="ml-1" color="primary" height={10} width={10}/>
                </a>
            </div>
            {comments?.map((comment) => (
              <div className="content-wrapper child mb-3" key={comment?.id}>
                <p className="p-small trans">
                  @{comment?.user.login}{" "}
                  {comment?.updated_at && formatDate(comment?.updated_at)}
                </p>
                <p className="p-small"><MarkedRender source={comment?.body || `_No comment available_`} /></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
  };
};

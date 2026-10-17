import { LinkButton, Page, PageHeader } from "../components/kit";

export default function NotFound() {
  return (
    <Page width="read">
      <PageHeader title="Page not found">That page does not exist. It may have moved.</PageHeader>
      <div className="flex flex-wrap gap-3"><LinkButton to="/">Go home</LinkButton><LinkButton to="/today" variant="secondary">Open Today</LinkButton></div>
    </Page>
  );
}

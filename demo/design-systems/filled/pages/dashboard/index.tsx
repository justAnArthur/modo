import './dashboard.css'
import Card from '../../blocks/card'
import Panel from '../../components/panel'
import Sidebar from '../../components/sidebar'
import Badge from '../../primitives/badge'

/**
 * A full screen assembled from the blocks below it: the navigation sidebar
 * beside a grid of cards.
 *
 * @example {@include ./examples.mdx}
 */
export default function Dashboard({
  title = 'Overview',
}: {
  /** The page heading. */
  title?: string
}) {
  return (
    <div className="my-dashboard">
      <Sidebar>
        <Sidebar.Section title="Workspace">
          <Sidebar.Item href="#overview" active>
            Overview
          </Sidebar.Item>
          <Sidebar.Item href="#projects">Projects</Sidebar.Item>
          <Sidebar.Item href="#settings">Settings</Sidebar.Item>
        </Sidebar.Section>
      </Sidebar>
      <main className="my-dashboard-main">
        <h1 className="my-dashboard-title">
          {title} <Badge>Beta</Badge>
        </h1>
        <Panel>
          <p>Three projects need a review this week.</p>
        </Panel>
        <div className="my-dashboard-cards">
          <Card title="Projects">12 active, 3 archived.</Card>
          <Card title="Members">8 people across two teams.</Card>
          <Card title="Usage">64% of this month's quota.</Card>
        </div>
      </main>
    </div>
  )
}

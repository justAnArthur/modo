import Button from '../../../primitives/button'
import Sidebar from '..'
import Select from '../../../components/select'

<Sidebar className="!min-h-0" style={{ maxWidth: 220 }}>
  <Sidebar.Section title="Foundations">
    <Sidebar.Item href="#colors" active>Colors</Sidebar.Item>
    <Sidebar.Item href="#surfaces">Surfaces</Sidebar.Item>
  </Sidebar.Section>
  <Sidebar.Section title="Components">
    <Sidebar.Item href="#button">Button</Sidebar.Item>
    <Sidebar.Item href="#select">Select</Sidebar.Item>
  </Sidebar.Section>
</Sidebar>

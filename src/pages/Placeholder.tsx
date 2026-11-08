import { Card } from '../components/ui'

export default function Placeholder({ name }: { name: string }) {
  return (
    <Card className="py-16 text-center">
      <p className="m-0 text-lg font-bold">{name}</p>
      <p className="m-0 mt-2 text-sm text-muted">الصفحة دي هتتبنى في المرحلة الجاية.</p>
    </Card>
  )
}

import App from '@/components/App'

export default async function Page({ searchParams }: { searchParams: Promise<{ doc?: string }> }) {
  const { doc } = await searchParams
  return <App doc={doc ?? ''} />
}

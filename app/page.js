import dynamic from 'next/dynamic'
const Page = dynamic(() => import('./_client'), { ssr: false, loading: () => null })
export default Page

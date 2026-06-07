import dynamic from 'next/dynamic'
const AppPage = dynamic(() => import('./_client'), { ssr: false, loading: () => null })
export default AppPage

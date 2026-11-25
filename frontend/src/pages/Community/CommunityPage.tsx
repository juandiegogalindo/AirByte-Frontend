import Community from './Community'
import { SiteFooter, SiteHeader } from '../../components/SiteChrome'

export default function CommunityPage() {
  const locality = new URLSearchParams(window.location.search).get('localidad') || 'tunjuelito'
  return <>
    <SiteHeader />
    <main className="community-page">
      <Community initialLocality={locality} />
    </main>
    <SiteFooter />
  </>
}

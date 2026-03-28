import { redirect } from 'next/navigation'

// Root redirects to the log page (home screen)
export default function RootPage() {
  redirect('/log')
}

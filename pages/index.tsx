// Root redirect — homepage is the marketing landing page
export function getServerSideProps() {
  return {
    redirect: {
      destination: '/landing.html',
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}

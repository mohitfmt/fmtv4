// components/common/Meta.tsx
import Head from "next/head";

interface MetaProps {
  title: string;
  description: string;
  canonical?: string;
}

const Meta = ({ title, description, canonical }: MetaProps) => (
  <Head>
    <title>{title}</title>
    <meta name="description" content={description} />
    {canonical && <link rel="canonical" href={`https://www.freemalaysiatoday.com/${canonical}/`} />}
  </Head>
);

export default Meta;

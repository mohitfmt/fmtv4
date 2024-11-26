import { SVGProps } from 'react';

export const LogoSVG = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1218 512"
    role="img"
    aria-label="Free Malaysia Today - Logo SVG"
    {...props}
  >
    <circle cx={256} cy={256} r={240} fill="#a92c23" />
    <circle cx={962} cy={256} r={240} fill="#1d5aaa" />
    <circle cx={609} cy={256} r={240} fill="#f2a838" />
    <path d="M182,354V158H330v44H234v40h86v44H234v68H182Z" fill="white" />
    <path
      d="M498,354V158h44l67,110,67-110h44V354H668V258l-47,74H597l-47-74v96H498Z"
      fill="white"
    />
    <path d="M876,158h172v44H988V354H936V202H876V158Z" fill="white" />
  </svg>
);

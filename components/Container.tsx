import React, { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  return <div className="max-w-[1440px] mx-auto px-2 font-rhd">{children}</div>;
};

export default Container;

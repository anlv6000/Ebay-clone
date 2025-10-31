import React from "react";

const Badge = ({ text }) => {
  return (
    <div className="btn-pill-primary w-[96px] h-[36px] flex justify-center items-center text-sm">
      {text}
    </div>
  );
};

export default Badge;

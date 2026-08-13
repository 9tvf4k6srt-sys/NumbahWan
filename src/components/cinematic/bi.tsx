type BiProps = {
  zh: string;
  en: string;
  className?: string;
};

/** Chinese on top, English under. Never italic-serif the English. */
export function Bi({ zh, en, className = "" }: BiProps) {
  return (
    <span className={`flex flex-col ${className}`}>
      <span className="font-cjk" lang="zh-Hant">
        {zh}
      </span>
      <span className="font-display text-mist" lang="en">
        {en}
      </span>
    </span>
  );
}

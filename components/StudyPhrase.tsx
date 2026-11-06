import { Fragment, type CSSProperties } from "react";
import { getStudyPhrase, isLongStudy } from "@/lib/study-status";

const RAINBOW_COLORS = [
  "var(--study-rainbow-0)",
  "var(--study-rainbow-1)",
  "var(--study-rainbow-2)",
  "var(--study-rainbow-3)",
  "var(--study-rainbow-4)",
  "var(--study-rainbow-5)",
  "var(--study-rainbow-6)",
] as const;

type StudyLetterStyle = CSSProperties & {
  "--study-letter-color": string;
  "--study-letter-delay": string;
};

export function StudyPhrase({
  sessionKey,
  elapsedMs,
  className,
}: {
  sessionKey: string;
  elapsedMs: number;
  className?: string;
}) {
  const phrase = getStudyPhrase(sessionKey);
  const rainbow = isLongStudy(elapsedMs);
  const words = phrase.split(" ");
  let letterIndex = 0;

  return (
    <span className={`study-phrase${rainbow ? " study-phrase--rainbow" : ""}${className ? ` ${className}` : ""}`}>
      <span className="sr-only">Studying: {phrase}</span>
      <span aria-hidden="true">
        {rainbow
          ? words.map((word, wordIndex) => (
              <Fragment key={wordIndex}>
                <span className="study-phrase__word">
                  {Array.from(word).map((letter, index) => {
                    const currentIndex = letterIndex++;
                    const style: StudyLetterStyle = {
                      "--study-letter-color": RAINBOW_COLORS[currentIndex % RAINBOW_COLORS.length],
                      "--study-letter-delay": `${(-currentIndex * 0.35).toFixed(2)}s`,
                    };

                    return (
                      <span key={index} className="study-phrase__letter" style={style}>
                        {letter}
                      </span>
                    );
                  })}
                </span>
                {wordIndex < words.length - 1 ? " " : null}
              </Fragment>
            ))
          : phrase}
      </span>
    </span>
  );
}

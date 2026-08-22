// This page displays the score returned by Learning Service after a study attempt.
type ResultPageProps = {
  correctCount: number;
  totalCount: number;
  onRetry: () => void;
  onExit: () => void;
};

export function ResultPage({ correctCount, totalCount, onRetry, onExit }: ResultPageProps) {
  const accuracy = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <main className="result-page">
      <section aria-labelledby="result-title" className="result-card">
        <p className="eyebrow">KẾT QUẢ BÀI HỌC</p>
        <div className="result-score" aria-label={`${correctCount} trên ${totalCount} câu đúng`}>
          <div className="result-score-value">
            <strong>{correctCount}</strong>
            <span>/ {totalCount}</span>
          </div>
        </div>
        <h1 id="result-title">Bạn đã hoàn thành bài học</h1>
        <p className="result-summary">
          Trả lời đúng <strong>{correctCount}</strong> trên tổng số {totalCount} câu
          ({accuracy}%).
        </p>
        <div className="result-actions">
          <button className="result-retry-button" onClick={onRetry} type="button">
            Làm lại
          </button>
          <button className="result-exit-button" onClick={onExit} type="button">
            Thoát
          </button>
        </div>
      </section>
    </main>
  );
}

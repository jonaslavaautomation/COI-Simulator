import type { GradeResult } from '@/types';

interface Props {
  result: GradeResult;
  onContinueEditing: () => void;
  onReturnToContact: () => void;
}

export function ResultModal({ result, onContinueEditing, onReturnToContact }: Props) {
  const { score, passed, errors } = result;
  return (
    <div className="legacy-modal-overlay">
      <div className="result-modal">
        <div className={passed ? 'modal-green-head' : 'modal-green-head result-fail-head'}>
          {passed ? 'Certificate Saved' : 'Review Required'}
          <button onClick={passed ? onReturnToContact : onContinueEditing}>&times;</button>
        </div>
        <div className="modal-content result-content">
          <div className="result-score">{score}%</div>
          <div className={passed ? 'result-sub result-pass' : 'result-sub result-fail'}>
            {passed ? 'Matches the policy file - certificate issued.' : `${errors.length} item${errors.length === 1 ? '' : 's'} need attention.`}
          </div>
          {errors.length > 0 && (
            <ul className="result-errors">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
        <div className="modal-actions">
          {passed ? (
            <button className="ok-btn" onClick={onReturnToContact}>Return to Contact</button>
          ) : (
            <button className="ok-btn" onClick={onContinueEditing}>Continue Editing</button>
          )}
        </div>
      </div>
    </div>
  );
}

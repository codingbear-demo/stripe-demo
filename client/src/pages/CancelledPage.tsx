import { Link } from 'react-router-dom';

export default function CancelledPage() {
  return (
    <div className="page-center">
      <div className="card status-card">
        <div className="status-icon cancelled">&#10007;</div>
        <h1>Payment Cancelled</h1>
        <p>
          Your checkout was cancelled. No charges were made. You can try again
          anytime.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Plans
        </Link>
      </div>
    </div>
  );
}

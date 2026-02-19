import { Link } from 'react-router-dom';

export default function SuccessPage() {
  return (
    <div className="page-center">
      <div className="card status-card">
        <div className="status-icon success">&#10003;</div>
        <h1>Payment Submitted!</h1>
        <p>
          Your subscription is being processed. It may take a few moments for
          the webhook to confirm your payment.
        </p>
        <Link to="/account" className="btn btn-primary">
          View Account
        </Link>
      </div>
    </div>
  );
}

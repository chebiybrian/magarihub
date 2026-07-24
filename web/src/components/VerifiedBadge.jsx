// Small badge shown next to verified users/dealers everywhere in the app.
export default function VerifiedBadge({ verification }) {
  if (verification === 'DEALER_VERIFIED') {
    return <span className="badge badge-dealer" title="Verified dealer — business documents checked">✔ Verified Dealer</span>;
  }
  if (verification === 'ID_VERIFIED') {
    return <span className="badge badge-id" title="ID verified — National ID checked">✔ ID Verified</span>;
  }
  return null;
}

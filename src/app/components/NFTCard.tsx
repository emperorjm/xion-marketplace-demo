import { Link } from 'react-router-dom';

interface NFTCardProps {
  tokenId: string;
  name: string;
  image?: string;
  collection?: string;
  price?: string;
  denom?: string;
  owner?: string;
  isListed?: boolean;
  isOwned?: boolean;
  onClick?: () => void;
}

export function NFTCard({
  tokenId,
  name,
  image,
  collection,
  price,
  denom = 'XION',
  isListed,
  isOwned,
  onClick,
}: NFTCardProps) {
  const formatPrice = (amount: string, denomination: string) => {
    const num = parseFloat(amount) / 1_000_000; // Convert from micro units
    return `${num.toLocaleString()} ${denomination.replace('u', '').toUpperCase()}`;
  };

  const content = (
    <>
      <div className="nft-card-image">
        {image ? (
          <img src={image} alt={name} loading="lazy" />
        ) : (
          <div className="nft-card-placeholder">🖼️</div>
        )}
      </div>
      <div className="nft-card-content">
        <div className="nft-card-name">{name || `Token #${tokenId}`}</div>
        {collection && <div className="nft-card-collection">{collection}</div>}
        <div className="nft-card-price">
          {isListed && price ? (
            <>
              <span className="nft-card-price-label">Price</span>
              <span className="nft-card-price-value">{formatPrice(price, denom)}</span>
            </>
          ) : isOwned ? (
            <span className="nft-card-status owned">Owned</span>
          ) : (
            <span className="nft-card-status" style={{ opacity: 0.5 }}>Not Listed</span>
          )}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <div className="nft-card" onClick={onClick}>
        {content}
      </div>
    );
  }

  return (
    <Link to={`/item/${tokenId}`} className="nft-card" style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  );
}

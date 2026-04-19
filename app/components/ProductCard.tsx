'use client';
import { useState } from 'react';

interface Product {
  title: string;
  text: string;
  live: boolean;
  howItWorks: string[];
}

export default function ProductCard({ product }: { product: Product }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card">
      <div className="card-header">
        <h4>{product.title}</h4>
        {product.live && (
          <span className="live-badge">
            LIVE
          </span>
        )}
      </div>
      <p>{product.text}</p>

      <div className="how-it-works">
        <button
          className="how-it-works-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span>How it works</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z"/>
          </svg>
        </button>

        {isExpanded && (
          <ul className="how-it-works-list">
            {product.howItWorks.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

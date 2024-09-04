import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from '../../types';
import LinkItem from '../LinkItem/LinkItem';
import LoadingSpinner from '../common/LoadingSpinner';
import './SharedLinkLanding.css';

const SharedLinkLanding: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const [link, setLink] = useState<Link | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const linkDoc = await getDoc(doc(db, 'links', linkId!));
        if (linkDoc.exists()) {
          setLink({ id: linkDoc.id, ...linkDoc.data() } as Link);
        } else {
          setError('Link not found');
        }
      } catch (err) {
        console.error('Error fetching link:', err);
        setError('Failed to fetch link');
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [linkId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;
  if (!link) return null;

  return (
    <div className="shared-link-landing">
      <h1>Shared Link</h1>
      <LinkItem
        link={link}
        onDelete={() => {}}
        onReact={() => {}}
        onRemoveReaction={() => {}}
      />
      <div className="cta-container">
        <p>Want to see more links like this?</p>
        <RouterLink to={`/channel/${link.channelId}`} className="cta-button">
          View Channel
        </RouterLink>
      </div>
    </div>
  );
};

export default SharedLinkLanding;

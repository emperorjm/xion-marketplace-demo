import React from 'react';
import { ActionDefinition } from '../../lib/types';
import { ActionCard } from '../ActionCard';

interface Props {
  title: string;
  description?: string;
  actions: ActionDefinition[];
}

export const ActionSection: React.FC<Props> = ({ title, description, actions }) => {
  if (!actions.length) {
    return null;
  }
  return (
    <section>
      <div className="section-header">
        <h2>{title}</h2>
        {description && <span className="helper-text">{description}</span>}
      </div>
      <div className="grid">
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </div>
    </section>
  );
};

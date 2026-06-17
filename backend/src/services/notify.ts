import { NewRecognition } from '../store/types';

const BADGE_COLORS: Record<string, string> = {
  'Challenging the Process':  'F97316',
  'Enabling Others to Act':   '3B82F6',
  'Encouraging the Heart':    'EF4444',
  'Inspiring a Shared Vision':'A855F7',
  'Modelling the Way':        '14B8A6'
};

const BADGE_EMOJIS: Record<string, string> = {
  'Challenging the Process':   '🚀',
  'Enabling Others to Act':    '🤝',
  'Encouraging the Heart':     '❤️',
  'Inspiring a Shared Vision': '🔭',
  'Modelling the Way':         '🧭'
};

export async function notifyTeams(recognition: NewRecognition): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) {
    return;
  }

  const emoji = BADGE_EMOJIS[recognition.badgeName] || '🏅';
  const color = BADGE_COLORS[recognition.badgeName] || '6366F1';

  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: color,
    summary: `${recognition.senderName} recognised ${recognition.receiverName}`,
    sections: [
      {
        activityTitle: `${emoji} **${recognition.senderName}** recognised **${recognition.receiverName}**`,
        activitySubtitle: `${recognition.badgeName} · ${recognition.receiverName}'s team: ${recognition.department}`,
        activityText: recognition.message
      }
    ]
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
  } catch {
    // Notification failure must never break the recognition submission.
  }
}

import { NewRecognition } from '../store/types';

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

  // Power Automate (Teams Workflows) webhook expects an Adaptive Card payload.
  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            {
              type: 'TextBlock',
              text: `${emoji} **${recognition.senderName}** recognised **${recognition.receiverName}**`,
              wrap: true,
              size: 'Medium',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: `${recognition.badgeName} · ${recognition.department}`,
              wrap: true,
              isSubtle: true,
              spacing: 'None'
            },
            {
              type: 'TextBlock',
              text: recognition.message,
              wrap: true,
              spacing: 'Small'
            }
          ]
        }
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

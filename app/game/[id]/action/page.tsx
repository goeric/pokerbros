import { redirect } from 'next/navigation';
import { validateAndConsumeToken } from '@/lib/email/action-tokens';
import { addRSVPViaToken, cancelRSVPViaToken } from './actions';

interface ActionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ActionPage({ params, searchParams }: ActionPageProps) {
  const { id: gameId } = await params;
  const { token } = await searchParams;

  // If no token provided, redirect to game page
  if (!token) {
    redirect(`/game/${gameId}`);
  }

  // Validate and consume the token
  const result = await validateAndConsumeToken(token);

  // Handle invalid token
  if (!result.success || !result.gameId || !result.playerId || !result.action) {
    redirect(`/game/${gameId}?error=invalid_token`);
  }

  // Verify the token's gameId matches the URL gameId
  if (result.gameId !== gameId) {
    redirect(`/game/${gameId}?error=token_mismatch`);
  }

  // Execute the action
  if (result.action === 'rsvp') {
    const actionResult = await addRSVPViaToken(result.gameId, result.playerId);
    if (!('success' in actionResult) || !actionResult.success) {
      redirect(`/game/${gameId}?error=action_failed`);
    }
    redirect(`/game/${gameId}?success=rsvp_added`);
  } else if (result.action === 'cancel_rsvp') {
    const actionResult = await cancelRSVPViaToken(result.gameId, result.playerId);
    if (!('success' in actionResult) || !actionResult.success) {
      redirect(`/game/${gameId}?error=action_failed`);
    }
    redirect(`/game/${gameId}?success=rsvp_cancelled`);
  }

  // Fallback redirect
  redirect(`/game/${gameId}`);
}

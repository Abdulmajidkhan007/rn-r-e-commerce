import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { Review } from '@kidswear/core';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Rating } from '@/components/Rating';

export interface ReviewCardProps {
  review: Pick<Review, 'authorName' | 'rating' | 'text' | 'createdAt'>;
}

/** One review: stars, date, text and author. */
export function ReviewCard({ review }: ReviewCardProps): React.ReactElement {
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 6 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Rating value={review.rating} size={16} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(review.createdAt, language)}
          </Text>
        </View>
        {review.text ? <Text variant="bodyMedium">{review.text}</Text> : null}
        <Text variant="labelLarge">{review.authorName}</Text>
      </Card.Content>
    </Card>
  );
}

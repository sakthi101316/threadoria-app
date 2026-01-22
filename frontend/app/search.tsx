import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { VoiceButton } from '../src/components/VoiceButton';
import { api } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  extra?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [query, setQuery] = useState((params.query as string) || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      searchDebounced(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const searchDebounced = async (searchQuery: string) => {
    setLoading(true);
    try {
      const data = await api.globalSearch(searchQuery);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setQuery(text);
  };

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'customer') {
      router.push(`/customer/${result.id}`);
    } else if (result.type === 'order') {
      router.push(`/order/${result.id}`);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity onPress={() => handleResultPress(item)} activeOpacity={0.8}>
      <GlassCard style={styles.resultCard}>
        <View style={styles.resultIcon}>
          <Ionicons
            name={item.type === 'customer' ? 'person' : 'receipt'}
            size={24}
            color={item.type === 'customer' ? COLORS.accent : COLORS.primary}
          />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>{item.title}</Text>
          <View style={styles.resultMeta}>
            {item.type === 'order' ? (
              <StatusBadge status={item.subtitle} />
            ) : (
              <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          {item.extra && <Text style={styles.resultExtra}>{item.extra}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.cream, '#FFF5E6', COLORS.cream]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers, orders..."
            placeholderTextColor={COLORS.gray}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          ) : null}
        </View>
        <VoiceButton onTranscription={handleVoiceTranscription} size={48} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            query.trim() ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try different keywords</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="mic" size={64} color={COLORS.gold} />
                <Text style={styles.emptyText}>Voice Search</Text>
                <Text style={styles.emptySubtext}>
                  Tap the microphone or type to search
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  headerRight: {
    width: 40,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  resultExtra: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
});

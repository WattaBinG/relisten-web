'use client';

import { durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import { RawParams } from '@/types/params';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { useSelector } from 'react-redux';
import { GaplessMetadata, Set, Source, Tape } from '../types';
import type { RootState } from '@/redux';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import { sortSources } from '@/lib/sortSources';
import AddToPlaylistButton from './playlists/AddToPlaylistButton';
import AddShowToPlaylistButton from './playlists/AddShowToPlaylistButton';
import { useArtistName, type NewTrackInput } from '@/lib/cloud/playlists';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'> & {
  show?: Partial<Tape>;
  routePrefix?: string;
};

interface SourceData {
  gaplessTracksMetadata: GaplessMetadata[];
  activePlaybackSourceId: number | undefined;
  activeSourceId: number | undefined;
  isActiveSourcePlaying: boolean;
  activePlaybackTrackId?: number;
  displayDate: string | undefined;
  activeSourceObj: Source | undefined;
  sourcesData: Source[];
}

export const useSourceData = ({
  year,
  month,
  day,
  show,
  source,
}: Props & { source: string }): SourceData => {
  const activePlaybackSourceId = useSelector(({ playback }: RootState) =>
    playback.source ? parseInt(playback.source, 10) : undefined
  );
  const activePlaybackTrackId = useSelector(({ playback }: RootState) => playback.activeTrack?.id);
  const gaplessTracksMetadata = useSelector(
    ({ playback }: RootState) => playback.gaplessTracksMetadata
  );

  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const activeSourceId = Number(source) || show?.sources?.[0]?.id;

  const activeSourceObj = show?.sources?.find((source) => source.id === activeSourceId);

  return {
    gaplessTracksMetadata,
    activePlaybackSourceId,
    activeSourceId: activeSourceObj?.id,
    activePlaybackTrackId,
    isActiveSourcePlaying: activeSourceObj?.id === activePlaybackSourceId,
    displayDate,
    activeSourceObj,
    sourcesData: sortSources(show?.sources ?? []),
  };
};

const SongsColumn = (props: Props) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();
  const {
    gaplessTracksMetadata,
    isActiveSourcePlaying,
    activeSourceObj,
    activePlaybackTrackId,
    displayDate,
  } = useSourceData({
    ...props,
    source: sourceId,
  });
  const artistName = useArtistName(props.artistSlug);

  // Every track of the active source, for "Add show to playlist".
  const showUuid = props.show?.uuid;
  const sourceUuid = activeSourceObj?.uuid;
  const artistSlug = props.artistSlug;
  const showTracks: NewTrackInput[] =
    showUuid && sourceUuid && artistSlug
      ? (activeSourceObj?.sets ?? []).flatMap((set) =>
          (set.tracks ?? [])
            .filter((t) => t.uuid)
            .map((t) => ({
              artist_name: artistName || artistSlug,
              artist_slug: artistSlug,
              show_uuid: showUuid,
              show_date: props.show?.display_date ?? displayDate ?? '',
              venue_name: props.show?.venue?.name ?? null,
              source_uuid: sourceUuid,
              track_uuid: t.uuid ?? '',
              song_title: t.title ?? 'Untitled',
              track_position: t.track_position ?? null,
              duration_seconds: t.duration ?? null,
            }))
        )
      : [];

  return (
    <Column
      heading={
        activeSourceObj
          ? `${removeLeadingZero(props.month)}/${removeLeadingZero(props.day)}/${props.year?.slice(
              2
            )}`
          : 'Songs'
      }
    >
      {showTracks.length > 0 && (
        <div className="border-b border-gray-100 px-2 py-2">
          <AddShowToPlaylistButton
            tracks={showTracks}
            showLabel={`${artistName || props.artistSlug} ${displayDate ?? ''}`.trim()}
          />
        </div>
      )}
      {activeSourceObj &&
        activeSourceObj.sets?.map((set, setIdx) =>
          set.tracks?.map((track, trackIdx) => {
            const trackIsActive = track.id === activePlaybackTrackId && isActiveSourcePlaying;

            const trackMetadata = isActiveSourcePlaying
              ? gaplessTracksMetadata.find(
                  (gaplessTrack) =>
                    gaplessTrack.trackMetadata && gaplessTrack.trackMetadata.trackId === track.id
                )
              : null;

            return (
              <div key={track.id}>
                {trackIdx === 0 && Number(activeSourceObj.sets?.length) > 1 && (
                  <RowHeader>
                    {set.name || `Set ${setIdx + 1}`} <div>{getSetTime(set)}</div>
                  </RowHeader>
                )}
                <Row
                  key={track.id}
                  href={`${props.routePrefix || ''}/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${activeSourceObj.id}`}
                  isActiveOverride={trackIsActive}
                >
                  <div>
                    <div>{track.title}</div>
                    {track.duration && (
                      <div className="text-xxs text-foreground-muted">
                        {durationToHHMMSS(track.duration)}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-right">
                    {track.uuid && activeSourceObj.uuid && props.show?.uuid && props.artistSlug && (
                      <AddToPlaylistButton
                        track={{
                          artist_name: artistName || props.artistSlug,
                          artist_slug: props.artistSlug,
                          show_uuid: props.show.uuid,
                          show_date: props.show.display_date ?? displayDate ?? '',
                          venue_name: props.show.venue?.name ?? null,
                          source_uuid: activeSourceObj.uuid,
                          track_uuid: track.uuid,
                          song_title: track.title ?? 'Untitled',
                          track_position: track.track_position ?? null,
                          duration_seconds: track.duration ?? null,
                        }}
                      />
                    )}
                    {trackMetadata && (() => {
                      if (trackMetadata.webAudioLoadingState === 'LOADED')
                        return <Tag variant="success">{'\u2713'} GAPLESS</Tag>;
                      if (trackMetadata.webAudioLoadingState === 'LOADING')
                        return <Tag variant="warning">LOADING</Tag>;
                      if (trackMetadata.webAudioLoadingState === 'ERROR')
                        return <Tag variant="error">ERROR</Tag>;
                      return null;
                    })()}
                  </div>
                </Row>
              </div>
            );
          })
        )}
      {activeSourceObj && <RowHeader>FIN</RowHeader>}
      {activeSourceObj &&
        activeSourceObj.links &&
        activeSourceObj.links.map((link) => (
          <a href={link.url} target="_blank" key={link.id} rel="noreferrer">
            <Row>{link.label}</Row>
          </a>
        ))}
    </Column>
  );
};

export default SongsColumn;

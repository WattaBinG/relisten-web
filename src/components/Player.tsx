'use client';

import Link from 'next/link';
import React, { useRef, useState } from 'react';

import type { RootState } from '@/redux';
import {
  FastForwardIcon,
  ListMusicIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import player from '../lib/player';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils';
import Flex from './Flex';

interface Props {
  artistSlugsToName: Record<string, string | undefined>;
}

const SKIP_BACK_SECONDS = 15;
const SKIP_FWD_SECONDS = 30;

/**
 * Bottom player bar: a full-width draggable scrubber on top, transport
 * controls + track info below. Drag the knob (or tap anywhere on the bar)
 * to seek; -15s/+30s buttons jump around inside long jams.
 */
const Player = ({ artistSlugsToName }: Props) => {
  const playback = useSelector((state: RootState) => state.playback);
  const [showRemainingDuration, setShowRemainingDuration] = useState(false);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const scrubRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(
    (typeof localStorage !== 'undefined' && localStorage.volume) || 1
  );

  const { year, month, day } = splitShowDate(playback.showDate);
  const { artistSlug, source } = playback;
  const artistName = artistSlug ? artistSlugsToName[artistSlug] : undefined;
  const activeTrack = playback.tracks.find(
    (_track, idx: number) => idx === playback.activeTrack.index
  );

  const duration = playback.activeTrack.duration ?? 0;
  const currentTime = playback.activeTrack.currentTime ?? 0;
  const fraction = scrubFraction ?? (duration > 0 ? currentTime / duration : 0);

  const fractionFromClientX = (clientX: number) => {
    const rect = scrubRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0) return 0;

    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const onScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = fractionFromClientX(e.clientX);
    setScrubFraction(f);
    const rect = scrubRef.current?.getBoundingClientRect();
    setHoverX(e.clientX - (rect?.left ?? 0));
    setHoverLabel(durationToHHMMSS(f * duration));
  };

  const onScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = scrubRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const f = fractionFromClientX(e.clientX);
    setHoverX(x);
    setHoverLabel(durationToHHMMSS(f * duration));
    if (scrubFraction !== null) setScrubFraction(f);
  };

  const onScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubFraction !== null) {
      player.seek(fractionFromClientX(e.clientX) * duration);
    }
    setScrubFraction(null);
  };

  const skipBy = (delta: number) => {
    player.seek(Math.min(Math.max(0, currentTime + delta), duration));
  };

  const toggleRemainingDuration = () => {
    setShowRemainingDuration((t) => !t);
  };

  const updateVolume = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const height = rect.height;
    const nextVolume = (height - (e.pageY - rect.top)) / height;

    setVolume(Math.max(0, Math.min(1, nextVolume)));

    player.setVolume(Math.max(0, Math.min(1, nextVolume)));

    localStorage.volume = Math.max(0, Math.min(1, nextVolume));
  };

  if (!activeTrack) return <div className="h-full w-full" />;

  const showHref = `/${artistSlug}/${year}/${month}/${day}?source=${source}`;

  return (
    <div className="flex h-full w-full flex-col select-none">
      {/* Scrubber: drag the knob or tap anywhere to seek */}
      <div
        ref={scrubRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(scrubFraction !== null ? scrubFraction * duration : currentTime)}
        className="group relative flex h-6 w-full shrink-0 cursor-pointer touch-none items-center px-2"
        onPointerDown={onScrubPointerDown}
        onPointerMove={onScrubPointerMove}
        onPointerUp={onScrubPointerUp}
        onPointerCancel={() => setScrubFraction(null)}
        onPointerLeave={() => {
          if (scrubFraction === null) setHoverLabel(null);
        }}
      >
        <div className="relative h-[6px] w-full rounded-full bg-[#d4d4d4]">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-[#5b2f8f]"
            style={{ width: `${(fraction * 100).toFixed(2)}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md ring-1 ring-black/20 transition-opacity group-hover:opacity-100 group-active:scale-110 group-active:opacity-100"
            style={{ left: `${(fraction * 100).toFixed(2)}%` }}
          />
        </div>
        {hoverLabel !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-gray-100 tabular-nums shadow-lg"
            style={{ left: Math.min(Math.max(hoverX, 28), (scrubRef.current?.clientWidth ?? 56) - 28) }}
          >
            {hoverLabel}
          </div>
        )}
      </div>

      {/* Transport + track info */}
      <Flex className="min-h-0 flex-1 items-center gap-1 px-1 pb-1 sm:gap-1.5">
        <button
          type="button"
          aria-label={playback.activeTrack.isPaused ? 'Play' : 'Pause'}
          onClick={() => player.togglePlayPause()}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 active:text-gray-600"
        >
          {playback.activeTrack.isPaused ? (
            <PlayIcon size={22} className="fill-gray-800" />
          ) : (
            <PauseIcon size={22} className="fill-gray-800" />
          )}
        </button>
        <button
          type="button"
          aria-label="Back 15 seconds"
          title="Back 15 seconds"
          onClick={() => skipBy(-SKIP_BACK_SECONDS)}
          className="flex h-7 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[0.7em] font-semibold text-gray-600 tabular-nums hover:bg-gray-100 active:bg-gray-200"
        >
          -15
        </button>
        <button
          type="button"
          aria-label="Forward 30 seconds"
          title="Forward 30 seconds"
          onClick={() => skipBy(SKIP_FWD_SECONDS)}
          className="flex h-7 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[0.7em] font-semibold text-gray-600 tabular-nums hover:bg-gray-100 active:bg-gray-200"
        >
          +30
        </button>

        <div className="mx-1 min-w-0 flex-1 text-left leading-tight">
          <div className="truncate text-[0.95em] font-medium text-gray-900">
            {activeTrack.title}
          </div>
          <Link
            href="/"
            as={showHref}
            className="text-foreground-muted block truncate text-[0.78em] hover:underline"
          >
            {artistName} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/
            {year.slice(2)}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Previous track"
          title="Previous track"
          onClick={() => player.previous()}
          className="hidden shrink-0 cursor-pointer rounded-full p-1.5 text-gray-500 hover:bg-gray-100 sm:block"
        >
          <RewindIcon size={16} className="fill-gray-500" />
        </button>
        <button
          type="button"
          aria-label="Next track"
          title="Next track"
          onClick={() => player.next()}
          className="hidden shrink-0 cursor-pointer rounded-full p-1.5 text-gray-500 hover:bg-gray-100 sm:block"
        >
          <FastForwardIcon size={16} className="fill-gray-500" />
        </button>

        <div
          onClick={toggleRemainingDuration}
          title="Toggle remaining time"
          className="text-foreground-muted shrink-0 cursor-pointer text-[0.8em] tabular-nums"
        >
          {durationToHHMMSS(
            showRemainingDuration ? currentTime - duration : currentTime
          )}
          <span className="text-gray-400"> / {durationToHHMMSS(duration)}</span>
        </div>

        <div className="volume-control hidden shrink-0 self-stretch py-1 md:block">
          <div
            className="relative h-full w-[6px] cursor-pointer rounded-full bg-[#0000001a]"
            onClick={updateVolume}
            title="Volume"
          >
            <div
              className="pointer-events-none absolute right-0 bottom-0 left-0 rounded-full bg-[#707070]"
              style={{ height: `${volume * 100}%` }}
            />
          </div>
        </div>

        <Link
          href="/"
          as={showHref}
          aria-label="Now playing queue"
          className="text-foreground-muted hidden w-[36px] shrink-0 cursor-pointer items-center justify-center self-center active:text-gray-800 lg:flex"
        >
          <ListMusicIcon size={20} />
        </Link>
      </Flex>
    </div>
  );
};

export default Player;

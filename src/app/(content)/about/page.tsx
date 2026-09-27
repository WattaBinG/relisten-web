import Link from 'next/link';

const About = () => (
  <div className="content">
    <h1 className="mb-4">Welcome to The Lot</h1>

    <p>Peruse the various bands and enjoy their extensive live catalogues for free.</p>

    <p>
      The Lot is a free and open source platform for exploring recorded live concerts on the Web.
    </p>

    <p>
      This site is powered by{' '}
      <a href="https://archive.org" target="_blank" rel="noreferrer">
        Archive.org
      </a>
      ,{' '}
      <a href="https://phish.in" target="_blank" rel="noreferrer">
        Phish.in
      </a>
      , and&nbsp;
      <a
        href="https://docs.google.com/spreadsheets/d/1yAXu83gJBz08cW5OXoqNuN1IbvDXD2vCrDKj4zn1qmU/edit#gid=29"
        target="_blank"
        rel="noreferrer"
      >
        The Phish Spreadsheet
      </a>
      . And of course, all of the tapers, tranferrers, uploaders, bands, and organizers who make
      this all possible.
    </p>

    <p>
      We operate completely non-commercially and do not accept donations. If you do wish to donate,
      please direct donations towards the wonderful people at&nbsp;
      <a href="https://archive.org/donate/">Archive.org</a> or{' '}
      <a href="https://mbird.org/donations/">The Mockingbird Foundation</a>.
    </p>

    <h3>Mission</h3>

    <p>
      We strive to provide you with a simple and powerful experience that you can enjoy in the home
      or{' '}
      <Link href="/grateful-dead/1976/06/12/mission-in-the-rain?source=2173898">in the rain</Link>.
    </p>

    <h3>Free & Open Source</h3>

    <p>
      This entire platform is open source at{' '}
      <a href="https://github.com/WattaBinG/relisten-web" target="_blank" rel="noreferrer">
        https://github.com/WattaBinG/relisten-web
      </a>
      . If you are interested in contributing, open an issue on GitHub with questions or bugs.
    </p>

    <h3>Thank You & Enjoy</h3>

    <p>
      The Lot is built on the open-source{' '}
      <a href="https://relisten.net" target="_blank" rel="noreferrer">
        Relisten
      </a>{' '}
      project by{' '}
      <a href="https://saewitz.com" target="_blank" rel="noreferrer">
        Daniel Saewitz
      </a>{' '}
      and{' '}
      <a href="https://alecgorge.com" target="_blank" rel="noreferrer">
        Alec Gorge
      </a>
      .
    </p>

    <p>
      This site complies with{' '}
      <a href="https://archive.org/post/261115/hotlinking-allowed" target="_blank" rel="noreferrer">
        Archive.org's policy
      </a>
      .
    </p>

    <p className="italic">
      The Grateful Dead and our managing organizations have long encouraged the purely
      non-commercial exchange of music taped at our concerts and those of our individual members.
      That a new medium of distribution has arisen - digital audio files being traded over the
      Internet - does not change our policy in this regard. Our stipulations regarding digital
      distribution are merely extensions of those long-standing principles and they are as follow:
      No commercial gain may be sought by websites offering digital files of our music, whether
      through advertising, exploiting databases compiled from their traffic, or any other means. All
      participants in such digital exchange acknowledge and respect the copyrights of the
      performers, writers and publishers of the music. This notice should be clearly posted on all
      sites engaged in this activity. We reserve the ability to withdraw our sanction of
      non-commercial digital music should circumstances arise that compromise our ability to protect
      and steward the integrity of our work.
    </p>
  </div>
);

export const metadata = {
  title: 'About',
};

export default About;

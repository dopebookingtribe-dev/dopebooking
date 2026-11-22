import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CmsLegal } from "@/modules/legal/components/cms-legal";

export const metadata: Metadata = {
  title: "Music licence",
  alternates: { canonical: "/legal/music-license" },
};

export default function MusicLicensePage() {
  return (
    <CmsLegal doc="music-license">
      <LegalPage title="Music licence" updated="3 November 2026">
        <p>
          When you buy music on DopeBooking, the artist (or their label) keeps
          all rights. You get a personal licence to the files, as described
          here.
        </p>
        <h2>What you may do</h2>
        <ul>
          <li>Download the files and keep backup copies for yourself.</li>
          <li>Listen on any device you own.</li>
          <li>
            Play the tracks in your own DJ sets at clubs, festivals and private
            events. Public performance licences (for example from GEMA or your
            local society) are the venue&apos;s or organiser&apos;s
            responsibility. [LAWYER: confirm wording per country.]
          </li>
        </ul>
        <h2>What you may not do</h2>
        <ul>
          <li>Share, sell, give away or upload the files anywhere.</li>
          <li>Put the music on streaming or download platforms.</li>
          <li>
            Use it in videos, ads, games, podcasts or other productions, or
            remix and release it, without the artist&apos;s written permission.
          </li>
          <li>Use it to train or test AI systems.</li>
        </ul>
        <h2>Downloads</h2>
        <p>
          Your purchases stay in your music library (or behind the private link
          in your order email if you bought as a guest). Download links are
          created fresh each time and expire after a few minutes. If a release
          is later removed from the store, you keep access to what you bought.
        </p>
        <h2>Refunds</h2>
        <p>
          Music is digital content delivered right away. By buying you agree
          that delivery starts immediately and that the right of withdrawal ends
          once you download. If a file is faulty or not as described, contact us
          and we&apos;ll fix it or refund you. [LAWYER: EU consumer rules for
          digital content.]
        </p>
        <h2>If the licence ends</h2>
        <p>
          If you break these rules, the licence ends and we may close access to
          your downloads. A full refund of an order also ends the licence for
          what it contained.
        </p>
      </LegalPage>
    </CmsLegal>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies and local storage" updated="20 October 2026">
      <p>
        DopeBooking uses only strictly necessary storage, which doesn&apos;t
        require consent (§ 25(2) TDDDG).
      </p>
      <ul>
        <li>
          <strong>Sign-in session</strong> (cookies starting with{" "}
          <code>sb-</code>): keep you signed in. Set only when you sign in;
          removed when you sign out.
        </li>
        <li>
          <strong>Shopping cart</strong> (browser local storage,{" "}
          <code>dopebooking.cart.v1</code>): remembers the items in your cart on
          this device. Never sent to us until you check out.
        </li>
      </ul>
      <p>
        There are no analytics, advertising or social media cookies. Video
        providers can set their own cookies only after you press play on a
        video.
      </p>
    </LegalPage>
  );
}

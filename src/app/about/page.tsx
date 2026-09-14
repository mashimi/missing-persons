// src/app/about/page.tsx
export const metadata = {
  title: "About – Missing Persons Registry – Tanzania",
  description:
    "Why this registry exists, how data is protected, and how to run a mirror.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">About this registry</h1>

      <section className="prose prose-gray mt-6 max-w-none">
        <h2 className="text-xl font-semibold">Why we exist</h2>
        <p>
          Across Tanzania, people are taken — sometimes by armed men in
          civilian clothes, sometimes never to be seen again. Families search
          for answers while official records stay silent. This registry is
          maintained by civil-society volunteers to document every case, so
          that no one is forgotten and so that the record cannot simply be
          erased.
        </p>

        <h2 className="text-xl font-semibold">How the record survives</h2>
        <p>
          This site has no single server that can be switched off. The
          website is a static build pinned to IPFS, archived permanently on
          Arweave, mirrored as a Tor hidden service, and reachable through
          the decentralized name <strong>missingpersons-tz.eth</strong>. Any
          person or organization can re-host it — the more mirrors, the
          stronger the record.
        </p>

        <h2 className="text-xl font-semibold">How submissions are protected</h2>
        <ul>
          <li>
            Reports are encrypted with PGP <em>in your browser</em> before
            they are sent. We never see the plaintext while it travels.
          </li>
          <li>You may submit completely anonymously; no name is required.</li>
          <li>This site keeps no IP logs and works over Tor.</li>
          <li>
            Tips can also be sent via Signal to our bot for maximum
            anonymity.
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Verification</h2>
        <p>
          Every case requires at least two independent sources, or direct
          confirmation from the family, before it is published. Corrections
          and removal requests from families are honoured.
        </p>

        <h2 className="text-xl font-semibold">Run a mirror</h2>
        <p>
          The full source code and the latest IPFS CID are published with
          every release. Pin the CID yourself, or serve the static build from
          any static host. See the repository README for instructions.
        </p>

        <h2 className="text-xl font-semibold">Safety notice</h2>
        <p>
          If you are in danger, contact a trusted lawyer or human-rights
          organisation such as the Legal and Human Rights Centre (LHRC) in Dar
          es Salaam. When documenting a case, put the family&apos;s safety
          first: get consent, and never share details that could identify a
          family at risk.
        </p>
      </section>
    </div>
  );
}

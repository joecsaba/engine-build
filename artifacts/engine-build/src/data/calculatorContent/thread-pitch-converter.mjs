export default {
  slug: "thread-pitch-converter",
  intro: "You picked up a mystery bolt and need to identify the thread. With only TPI (threads per inch) or only metric pitch (mm between threads), you can't directly match — but a simple conversion gets you there.",
  sections: [
    {
      heading: "The relationship",
      body: `
        <p><strong>TPI × Pitch (mm) = 25.4</strong></p>
        <p>So if you measured 12.7 TPI, the equivalent metric pitch is 25.4 / 12.7 = 2.0 mm — that's M-something with 2.0 mm pitch.</p>
        <p>Reverse: a thread with 1.5 mm pitch = 25.4 / 1.5 = 16.93 TPI. Closest standard imperial = 16 TPI or 18 TPI — and the difference is enough that the wrong one will cross-thread.</p>
      `,
    },
    {
      heading: "Common engine thread pitches",
      body: `
        <ul>
          <li><strong>M6×1.0 ≈ 1/4-25</strong> (no standard imperial equivalent — don't mix)</li>
          <li><strong>M8×1.25 ≈ 5/16-20</strong> (close but not interchangeable)</li>
          <li><strong>M10×1.5 ≈ 3/8-17</strong> (no exact match — common bolt size confusion)</li>
          <li><strong>M12×1.5 ≈ 7/16-17</strong> (no exact match)</li>
          <li><strong>M14×2.0 ≈ 9/16-13</strong> (close — spark plug threads)</li>
        </ul>
        <p>The takeaway: metric and imperial threads of "similar size" are <em>never</em> compatible. Always verify with a thread gauge before forcing a bolt.</p>
      `,
    },
  ],
  related: [
    { slug: "tap-drill-lookup", title: "Tap Drill Size Lookup" },
    { slug: "bolt-spec-lookup", title: "Head Bolt & Main Bolt Specs" },
    { slug: "mm-inch-converter", title: "MM to Inch Converter" },
  ],
};

// Long-form body for /guides/machine-shop-quality. See bearing-clearance.mjs
// for the markup contract shared by every guide content file.

export default {
  slug: "machine-shop-quality",
  intro:
    "Not all machine shops do equal work. Some are excellent. Some will take your money, do substandard work, and hand it back in a box. Here's how to inspect what you got and catch problems before you button up an engine that will fail at 5,000 miles.",
  sections: [
    {
      heading: "What to do when you pick up your block",
      body: `
        <p>Don't just take the bag of parts and leave. Spend 15 minutes at the shop asking for a walkthrough of what was done and the measurements taken. A good shop will have documentation and will be glad to talk you through it. A bad shop will be defensive.</p>
        <p>Bring the measurements home written down. They are the baseline you will check every clearance against during assembly, and they are your evidence if something has to go back.</p>
      `,
    },
    {
      heading: "Inspecting the block",
      body: `
        <table>
          <thead>
            <tr><th>Check</th><th>What good looks like</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Bore surface finish</strong></td>
              <td>Uniform crosshatch at roughly 45&deg;, visible but fine. NO longitudinal scratches running up and down the bore. Smooth shiny spots mean the hone didn't cut evenly.</td>
            </tr>
            <tr>
              <td><strong>Bore size measurement</strong></td>
              <td>Ask for the measurement sheet. All bores within 0.0002" of each other; taper (top to bottom) under 0.0001". If they can't provide measurements, that's a problem.</td>
            </tr>
            <tr>
              <td><strong>Deck surface finish</strong></td>
              <td>Perfectly flat with a fine, uniform machine finish. No waves, high spots or rough patches. Against a straight edge there should be zero light gap anywhere.</td>
            </tr>
            <tr>
              <td><strong>Oil passages</strong></td>
              <td>Thoroughly cleaned. Run a bent wire into every gallery and blow compressed air through. One casting chip left in a gallery can destroy a bearing within the first hour.</td>
            </tr>
            <tr>
              <td><strong>Main bearing bores</strong></td>
              <td>Perfectly smooth and round. Any fretting, scoring or debris indicates a problem.</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Inspecting the cylinder heads",
      body: `
        <table>
          <thead>
            <tr><th>Check</th><th>What good looks like</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Valve seating</strong></td>
              <td>Blue Dykem on the seat, install the valve, rotate 45&deg; &mdash; the Dykem should wipe uniformly all the way around. Any gap means the seat isn't concentric or the valve face isn't flat.</td>
            </tr>
            <tr>
              <td><strong>Deck flatness</strong></td>
              <td>Straight edge and feeler gauges. Maximum allowable warp for most applications is 0.002"; a properly surfaced head should be 0.001" or better. A warped deck blows head gaskets.</td>
            </tr>
            <tr>
              <td><strong>Guide clearance</strong></td>
              <td>Wiggle each valve stem side to side. Minimal movement &mdash; 0.001"&ndash;0.003" intake, 0.002"&ndash;0.004" exhaust, application dependent. Excessive slop means worn guides that weren't repaired.</td>
            </tr>
            <tr>
              <td><strong>Combustion chamber volume</strong></td>
              <td>For a performance build, chambers cc'd and matched within 0.5 cc. Volume differences change compression ratio and unbalance power output cylinder to cylinder.</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Red flags — walk away or get it redone",
      body: `
        <ul>
          <li>Shop can't provide measurements &mdash; "we set it to spec" without documentation</li>
          <li>Block returned with visible casting flash or debris in the bore</li>
          <li>Deck or bore shows witness marks from previous machining that weren't cleaned up</li>
          <li>Head gasket surface shows waviness against a straight edge</li>
          <li>No crosshatch pattern visible in the bores (under-honed means the rings won't seat)</li>
          <li>Oil passages not thoroughly cleaned &mdash; look for discoloration and debris</li>
          <li>Work was done faster than it physically takes (a proper bore and hone takes time)</li>
          <li>No torque plates used when honing for performance applications</li>
          <li>Price dramatically below market rates &mdash; cheap machining is expensive in the long run</li>
        </ul>
        <aside data-tone="danger">
          <p>If the block comes back with debris in the oil galleries, do not "just flush it and go." Clean it properly yourself and re-inspect every passage. Bearing failure from machining debris usually shows up in the first hour of running, long after you have paid and left.</p>
        </aside>
      `,
    },
    {
      heading: "Questions to ask every machine shop",
      body: `
        <ol>
          <li>"Do you use a torque plate when honing?" Essential for performance builds &mdash; it simulates head bolt stress on the bore.</li>
          <li>"What is your bore-to-bore consistency spec?" The answer should be within 0.0002".</li>
          <li>"Do you provide a written measurement sheet?" If no, that is a warning sign.</li>
          <li>"What equipment do you use for boring and honing?" CNC equipment is a good sign.</li>
          <li>"How do you clean the block after machining?" The answer should be hot tank or jet wash, not a spray with the garden hose.</li>
          <li>"What is your normal turnaround time?" Rushed work cuts corners.</li>
        </ol>
        <aside data-tone="tip">
          <p>Ask these before you hand over the block, not when you collect it. A shop that answers all six comfortably is telling you how it works; a shop that gets irritated by them is telling you something too.</p>
        </aside>
      `,
    },
  ],
  related: [
    { slug: "bearing-clearance", title: "Bearing Clearance Calculator" },
    { slug: "head-milling", title: "Head Milling Calculator" },
    { slug: "compression-ratio", title: "Compression Ratio Calculator" },
  ],
};

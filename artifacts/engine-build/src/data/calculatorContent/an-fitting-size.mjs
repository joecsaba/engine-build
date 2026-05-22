export default {
  slug: "an-fitting-size",
  intro: "AN (Army-Navy) fittings size by the OD of the tube they fit, measured in 1/16\" increments. AN-6 means 6/16\" = 3/8\" tube OD. The thread on the fitting end is a 37° JIC flare; the port end (ORB) is straight-thread with an O-ring.",
  sections: [
    {
      heading: "AN size chart",
      body: `
        <table>
          <thead><tr><th>AN Size</th><th>Tube OD</th><th>JIC Thread</th><th>ORB Thread</th></tr></thead>
          <tbody>
            <tr><td>AN-3</td><td>3/16"</td><td>3/8-24</td><td>3/8-24</td></tr>
            <tr><td>AN-4</td><td>1/4"</td><td>7/16-20</td><td>7/16-20</td></tr>
            <tr><td>AN-6</td><td>3/8"</td><td>9/16-18</td><td>9/16-18</td></tr>
            <tr><td>AN-8</td><td>1/2"</td><td>3/4-16</td><td>3/4-16</td></tr>
            <tr><td>AN-10</td><td>5/8"</td><td>7/8-14</td><td>7/8-14</td></tr>
            <tr><td>AN-12</td><td>3/4"</td><td>1 1/16-12</td><td>1 1/16-12</td></tr>
            <tr><td>AN-16</td><td>1"</td><td>1 5/16-12</td><td>1 5/16-12</td></tr>
          </tbody>
        </table>
      `,
    },
    {
      heading: "Sizing by application",
      body: `
        <ul>
          <li><strong>EFI fuel feed (street):</strong> AN-6</li>
          <li><strong>EFI fuel return:</strong> AN-6</li>
          <li><strong>High-flow fuel feed (500+ HP):</strong> AN-8 or AN-10</li>
          <li><strong>Oil cooler:</strong> AN-10 or AN-12</li>
          <li><strong>Turbo oil feed:</strong> AN-4 (restrictor recommended)</li>
          <li><strong>Turbo oil drain:</strong> AN-10 minimum (gravity, low pressure)</li>
          <li><strong>Coolant lines:</strong> AN-16 or larger</li>
        </ul>
      `,
    },
  ],
  related: [
    { slug: "fuel-injector-sizing", title: "Fuel Injector Sizing Calculator" },
    { slug: "turbo-finder", title: "Turbo Finder & Sizing" },
    { slug: "pressure-converter", title: "Pressure Converter" },
  ],
};

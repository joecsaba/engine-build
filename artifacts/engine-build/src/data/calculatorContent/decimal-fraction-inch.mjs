export default {
  slug: "decimal-fraction-inch",
  intro: "A caliper reads 0.265\" — what fraction is that? Or you need to drill a 23/64\" hole and the spec is in thousandths. Decimal-to-fraction (and back) conversion you'll do a hundred times in a shop.",
  sections: [
    {
      heading: "Common decimal ↔ fraction equivalents",
      body: `
        <ul>
          <li><strong>1/16" = 0.0625"</strong></li>
          <li><strong>1/8" = 0.125"</strong></li>
          <li><strong>3/16" = 0.1875"</strong></li>
          <li><strong>1/4" = 0.250"</strong></li>
          <li><strong>5/16" = 0.3125"</strong></li>
          <li><strong>3/8" = 0.375"</strong></li>
          <li><strong>7/16" = 0.4375"</strong></li>
          <li><strong>1/2" = 0.500"</strong></li>
          <li><strong>5/8" = 0.625"</strong></li>
          <li><strong>3/4" = 0.750"</strong></li>
        </ul>
        <p>Round to nearest 1/64" for general shop work; 1/128" for precision machining.</p>
      `,
    },
  ],
  related: [
    { slug: "mm-inch-converter", title: "MM to Inch Converter" },
    { slug: "tap-drill-lookup", title: "Tap Drill Size Lookup" },
  ],
};

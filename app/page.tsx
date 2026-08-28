import { getMunicipalityBySlug } from "../lib/municipalities";
import { MunicipalityTheme } from "./municipality-theme";

export const dynamic = "force-dynamic";

const stateNames: Record<string, string> = {
  FL: "Florida",
};

export default async function Home() {
  const municipality = await getMunicipalityBySlug("clearwater");

  return (
    <MunicipalityTheme slug="clearwater"><main className="shell">
      <section className="intro" aria-labelledby="property-prompt">
        <header>
          <p className="wordmark">GROUND&shy;RULE</p>
          <p className="tagline">Property rules, made clear.</p>
        </header>

        <div className="prompt">
          <p className="location">
            {municipality
              ? `Starting with ${municipality.name}, ${stateNames[municipality.state] ?? municipality.state}`
              : "Municipality information temporarily unavailable."}
          </p>
          <h1 id="property-prompt">What do you want to do with your property?</h1>

          <div className="address-form" aria-label="Property address search">
            <label className="visually-hidden" htmlFor="address">
              Property address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Enter a property address"
              disabled
            />
            <button type="button" disabled>
              Continue
            </button>
          </div>
          <p className="status">Address lookup is coming soon.</p>
        </div>
      </section>
    </main></MunicipalityTheme>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Valkompass</h1>
        <p className="text-xl text-gray-600 mb-8">
          En källbaserad och granskningsbar matchning mellan dina åsikter och riksdagspartiernas positioner.
        </p>
        <Link
          href="/kompass"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Starta valkompassen →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">📄</div>
          <h3 className="font-semibold mb-1">Källbaserad</h3>
          <p className="text-sm text-gray-600">
            Varje partiposition är hämtad från partiets officiella webbplats, valmanifest eller partiprogram.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold mb-1">Transparent</h3>
          <p className="text-sm text-gray-600">
            Du kan alltid se exakt vilket citat som ligger bakom en position och hur AI:n har tolkat det.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="font-semibold mb-1">Granskad</h3>
          <p className="text-sm text-gray-600">
            Positioner som AI:n är osäker på markeras tydligt och behöver mänsklig granskning innan de används.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-sm text-amber-800">
        <strong>Notering:</strong> Valkompassen är ett verktyg i beta. Endast positioner med godkänd primärkälla
        används i matchningen. Om ett parti saknar tillräckliga källor visas en varning i resultatet.
      </div>
    </div>
  );
}

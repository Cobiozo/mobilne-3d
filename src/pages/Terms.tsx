import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót
            </Button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
              Regulamin
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-card rounded-lg border p-6 sm:p-8 lg:p-12">
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none dark:prose-invert">
            <h2 className="text-2xl font-bold mb-6">Kontakt</h2>
            <p>
              <strong>Nr telefonu:</strong> +48 518 339 298<br />
              <strong>E-mail:</strong> biuro@mobilne-3d.pl
            </p>
            
            <p className="mt-4">
              Sprzedawca odpowiada za wadliwy towar przez 1 rok od jego wydania.<br />
              <strong>Czas na reklamację:</strong> 1 rok<br />
              Dotyczy reklamacji z tytułu rękojmi lub braku zgodności towaru z umową
            </p>

            <p className="mt-4">
              <strong>Adres do reklamacji:</strong><br />
              Mobilne-it.pl Witold Bawołek<br />
              Wojska Polskiego 1<br />
              05-506 Lesznowola<br />
              Polska
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 1 Postanowienia wstępne</h3>
            <p>
              1. Sklep internetowy Mobilne-3D, dostępny pod adresem internetowym www.mobilne-3d.pl, prowadzony jest przez Mobilne-it.pl Witold Bawołek z siedzibą w Piasecznie przy ul. Puławskiej 4, kod pocztowy 05-500, NIP 1231207150, REGON 387119362
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 2 Definicje</h3>
            <ol>
              <li><strong>Konsument</strong> – osoba fizyczna zawierająca ze Sprzedawcą umowę w ramach Sklepu, której przedmiot nie jest związany bezpośrednio z jej działalnością gospodarczą lub zawodową.</li>
              <li><strong>Sprzedawca</strong> – Mobilne-it.pl Witold Bawołek z siedzibą w Piasecznie przy ul. Puławskiej 4, kod pocztowy 05-500, NIP 1231207150, REGON 387119362.</li>
              <li><strong>Klient</strong> – każdy podmiot dokonujący zakupów za pośrednictwem Sklepu.</li>
              <li><strong>Przedsiębiorca</strong> – osoba fizyczna, osoba prawna i jednostka organizacyjna niebędąca osobą prawną, której odrębna ustawa przyznaje zdolność prawną, wykonująca we własnym imieniu działalność gospodarczą, która korzysta ze Sklepu.</li>
              <li><strong>Sklep</strong> – sklep internetowy prowadzony przez Sprzedawcę pod adresem internetowym www.mobilne-3d.pl.</li>
              <li><strong>Umowa zawarta na odległość</strong> – umowa zawarta z Klientem w ramach zorganizowanego systemu zawierania umów na odległość (w ramach Sklepu), bez jednoczesnej fizycznej obecności stron, z wyłącznym wykorzystaniem jednego lub większej liczby środków porozumiewania się na odległość do chwili zawarcia umowy włącznie.</li>
              <li><strong>Regulamin</strong> – niniejszy regulamin Sklepu.</li>
              <li><strong>Zamówienie</strong> – oświadczenie woli Klienta składane za pomocą Formularza Zamówienia i zmierzające bezpośrednio do zawarcia Umowy Sprzedaży Produktu lub Produktów ze Sprzedawcą.</li>
              <li><strong>Konto</strong> – konto klienta w Sklepie, są w nim gromadzone są dane podane przez Klienta oraz informacje o złożonych przez niego Zamówieniach w Sklepie.</li>
              <li><strong>Formularz rejestracji</strong> – formularz dostępny w Sklepie, umożliwiający utworzenie Konta.</li>
              <li><strong>Formularz zamówienia</strong> – interaktywny formularz dostępny w Sklepie umożliwiający złożenie Zamówienia, w szczególności poprzez dodanie Produktów do Koszyka oraz określenie warunków Umowy Sprzedaży, w tym sposobu dostawy i płatności.</li>
              <li><strong>Koszyk</strong> – element oprogramowania Sklepu, w którym widoczne są wybrane przez Klienta Produkty do zakupu, a także istnieje możliwość ustalenia i modyfikacji danych Zamówienia, w szczególności ilości produktów.</li>
              <li><strong>Produkt</strong> – dostępna w Sklepie rzecz ruchoma będąca przedmiotem Umowy Sprzedaży między Klientem a Sprzedawcą.</li>
              <li><strong>Umowa Sprzedaży</strong> – umowa sprzedaży Produktu zawierana albo zawarta między Klientem a Sprzedawcą za pośrednictwem Sklepu internetowego. Przez Umowę Sprzedaży rozumie się też – stosowanie do cech Produktu – umowę o świadczenie usług i umowę o dzieło.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 3 Kontakt ze Sklepem</h3>
            <ol>
              <li>Adres Sprzedawcy: 05-500 Piaseczno, ul. Puławska 4</li>
              <li>Adres e-mail Sprzedawcy: biuro@mobilne-3d.pl</li>
              <li>Numer telefonu Sprzedawcy: 518339298</li>
              <li>Klient może porozumiewać się ze Sprzedawcą za pomocą adresów i numerów telefonów podanych w niniejszym paragrafie.</li>
              <li>Klient może porozumieć się telefonicznie ze Sprzedawcą w godzinach Poniedziałek-Piątek 9:00-17:00</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 4 Wymagania techniczne</h3>
            <p>Do korzystania ze Sklepu, w tym przeglądania asortymentu Sklepu oraz składania zamówień na Produkty, niezbędne są:</p>
            <ol type="a">
              <li>urządzenie końcowe z dostępem do sieci Internet i przeglądarką internetową</li>
              <li>aktywne konto poczty elektronicznej (e-mail)</li>
              <li>włączona obsługa plików cookies</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 5 Informacje ogólne</h3>
            <ol>
              <li>Sprzedawca w najszerszym dopuszczalnym przez prawo zakresie nie ponosi odpowiedzialności za zakłócenia w tym przerwy w funkcjonowaniu Sklepu spowodowane siłą wyższą, niedozwolonym działaniem osób trzecich lub niekompatybilnością Sklepu internetowego z infrastrukturą techniczną Klienta.</li>
              <li>Przeglądanie asortymentu Sklepu nie wymaga zakładania Konta. Składanie zamówień przez Klienta na Produkty znajdujące się w asortymencie Sklepu możliwe jest albo po założeniu Konta zgodnie z postanowieniami § 6 Regulaminu albo przez podanie niezbędnych danych osobowych i adresowych umożliwiających realizację Zamówienia bez zakładania Konta.</li>
              <li>Ceny podane w Sklepie są podane w polskich złotych i są cenami brutto (uwzględniają podatek VAT).</li>
              <li>Na końcową (ostateczną) kwotę do zapłaty przez Klienta składa się cena za Produkt oraz koszt dostawy (w tym opłaty za transport, dostarczenie i usługi pocztowe), o której Klient jest informowany na stronach Sklepu w trakcie składania Zamówienia, w tym także w chwili wyrażenia woli związania się Umową Sprzedaży.</li>
              <li>W przypadku Umowy obejmującej prenumeratę lub świadczenie usług na czas nieoznaczony końcową (ostateczną) ceną jest łączna cena obejmująca wszystkie płatności za okres rozliczeniowy.</li>
              <li>Gdy charakter przedmiotu Umowy nie pozwala, rozsądnie oceniając, na wcześniejsze obliczenie wysokości końcowej (ostatecznej) ceny, informacja o sposobie, w jaki cena będzie obliczana, a także o opłatach za transport, dostarczenie, usługi pocztowe oraz o innych kosztach, będzie podana w Sklepie w opisie Produktu.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 6 Zakładanie Konta w Sklepie</h3>
            <ol>
              <li>Aby założyć Konto w Sklepie, należy wypełnić Formularz rejestracji. Niezbędne jest podanie danych osobowych niezbędnych do wysyłki, adresu e-mail, oraz numeru telefonu.</li>
              <li>Założenie Konta w Sklepie jest darmowe.</li>
              <li>Logowanie się na Konto odbywa się poprzez podanie loginu i hasła ustanowionych w Formularzu rejestracji.</li>
              <li>Klient ma możliwość w każdej chwili, bez podania przyczyny i bez ponoszenia z tego tytułu jakichkolwiek opłat usunąć Konto poprzez wysłanie stosownego żądania do Sprzedawcy, w szczególności za pośrednictwem poczty elektronicznej lub pisemnie na adresy podane w § 3.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 7 Zasady składania Zamówienia</h3>
            <p>W celu złożenia Zamówienia należy:</p>
            <ol>
              <li>zalogować się do Sklepu (opcjonalnie);</li>
              <li>wybrać Produkt będący przedmiotem Zamówienia, a następnie kliknąć przycisk „Do koszyka" (lub równoznaczny);</li>
              <li>zalogować się;</li>
              <li>jeżeli wybrano możliwość złożenia Zamówienia bez rejestracji – wypełnić Formularz zamówienia poprzez wpisanie danych odbiorcy Zamówienia oraz adresu, na który ma nastąpić dostawa Produktu, wybrać rodzaj przesyłki (sposób dostarczenia Produktu), wpisać dane do faktury, jeśli są inne niż dane odbiorcy Zamówienia,</li>
              <li>kliknąć przycisk "Zamawiam i płacę"/kliknąć przycisk "Zamawiam i płacę" oraz potwierdzić zamówienie, klikając w link przesłany w wiadomości e-mail,</li>
              <li>wybrać jeden z dostępnych sposobów płatności i w zależności od sposobu płatności, opłacić zamówienie w określonym terminie, z zastrzeżeniem § 8 pkt 3.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 8 Oferowane metody dostawy oraz płatności</h3>
            <ol>
              <li>Klient może skorzystać z następujących metod dostawy lub odbioru zamówionego Produktu:
                <ol type="a">
                  <li>Przesyłka kurierska, przesyłka paczkomatowa</li>
                  <li>Odbiór osobisty dostępny pod adresem: 05-506 Lesznowola, ul. Wojska Polskiego 1</li>
                </ol>
              </li>
              <li>Klient może skorzystać z następujących metod płatności:
                <ol type="a">
                  <li>Płatność za pobraniem</li>
                  <li>Płatność przelewem na konto Sprzedawcy</li>
                  <li>Płatności elektroniczne za pomocą PayU</li>
                </ol>
              </li>
              <li>Szczegółowe informacje na temat metod dostawy oraz akceptowalnych metod płatności znajdują się za stronach Sklepu.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 9 Wykonanie umowy sprzedaży</h3>
            <ol>
              <li>Zawarcie Umowy Sprzedaży między Klientem a Sprzedawcą następuje po uprzednim złożeniu przez Klienta Zamówienia za pomocą Formularza zamówienia w Sklepie internetowym zgodnie z § 7 Regulaminu.</li>
              <li>Po złożeniu Zamówienia Sprzedawca niezwłocznie potwierdza jego otrzymanie oraz jednocześnie przyjmuje Zamówienie do realizacji. Potwierdzenie otrzymania Zamówienia i jego przyjęcie do realizacji następuje poprzez przesłanie przez Sprzedawcę Klientowi stosownej wiadomości e-mail na podany w trakcie składania Zamówienia adres poczty elektronicznej Klienta, która zawiera co najmniej oświadczenia Sprzedawcy o otrzymaniu Zamówienia i o jego przyjęciu do realizacji oraz potwierdzenie zawarcia Umowy Sprzedaży. Z chwilą otrzymania przez Klienta powyższej wiadomości e-mail zostaje zawarta Umowa Sprzedaży między Klientem a Sprzedawcą.</li>
              <li>W przypadku wyboru przez Klienta:
                <ol type="a">
                  <li>płatności przelewem, płatności elektronicznych Klient obowiązany jest do dokonania płatności w terminie 5 dni kalendarzowych od dnia zawarcia Umowy Sprzedaży – w przeciwnym razie zamówienie zostanie anulowane.</li>
                  <li>płatności za pobraniem przy odbiorze przesyłki, Klient obowiązany jest do dokonania płatności przy odbiorze przesyłki.</li>
                  <li>płatności gotówką przy odbiorze osobistym przesyłki, Klient obowiązany jest dokonać płatności przy odbiorze przesyłki w terminie 5 dni od dnia otrzymania informacji o gotowości przesyłki do odbioru.</li>
                </ol>
              </li>
              <li>Jeżeli Klient wybrał sposób dostawy inny niż odbiór osobisty, Produkt zostanie wysłany przez Sprzedawcę w terminie wskazanym w jego opisie (z zastrzeżeniem ustępu 5 niniejszego paragrafu), w sposób wybrany przez Klienta podczas składania Zamówienia.</li>
              <li>W przypadku zamówienia Produktów o różnych terminach dostawy, terminem dostawy jest najdłuższy podany termin.</li>
              <li>Początek biegu terminu dostawy Produktu do Klienta liczy się w następujący sposób:
                <ol type="a">
                  <li>W przypadku wyboru przez Klienta sposobu płatności przelewem, płatności elektroniczne lub kartą płatniczą – od dnia uznania rachunku bankowego Sprzedawcy.</li>
                  <li>W przypadku wyboru przez Klienta sposobu płatności za pobraniem – od dnia zawarcia Umowy Sprzedaży,</li>
                  <li>W przypadku wyboru przez Klienta odbioru osobistego Produktu, Produkt będzie gotowy do odbioru przez Klienta w terminie wskazanym w opisie Produktu. O gotowości Produktu do odbioru Klient zostanie dodatkowo poinformowany przez Sprzedawcę poprzez przesłanie stosownej wiadomości e-mail na podany w trakcie składania Zamówienia adres poczty elektronicznej Klienta.</li>
                </ol>
              </li>
              <li>W przypadku zamówienia Produktów o różnych terminach gotowości do odbioru, terminem gotowości do odbioru jest najdłuższy podany termin.</li>
              <li>Początek biegu terminu gotowości Produktu do odbioru przez Klienta liczy się w następujący sposób:
                <ol type="a">
                  <li>W przypadku wyboru przez Klienta sposobu płatności przelewem, płatności elektroniczne lub kartą płatniczą – od dnia uznania rachunku bankowego Sprzedawcy.</li>
                  <li>W przypadku wyboru przez Klienta sposobu gotówką przy odbiorze osobistym – od dnia zawarcia Umowy Sprzedaży.</li>
                </ol>
              </li>
              <li>Dostawa Produktu odbywa się wyłącznie na terenie Polski.</li>
              <li>Dostawa Produktu do Klienta jest odpłatna, chyba że Umowa Sprzedaży stanowi inaczej. Koszty dostawy Produktu (w tym opłaty za transport, dostarczenie i usługi pocztowe) są wskazywane Klientowi na stronach Sklepu internetowego w zakładce „Koszty dostawy" oraz w trakcie składania Zamówienia, w tym także w chwili wyrażenia przez Klienta woli związania się Umową Sprzedaży.</li>
              <li>Odbiór osobisty Produktu przez Klienta jest bezpłatny.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 10 Prawo odstąpienia od umowy</h3>
            <ol>
              <li>Prawo do odstąpienia od umowy zawartej na odległość nie przysługuje Konsumentowi w odniesieniu do Umowy:
                <ol type="a">
                  <li>w której przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji Konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb,</li>
                  <li>w której przedmiotem świadczenia jest rzecz dostarczana w zapieczętowanym opakowaniu, której po otwarciu opakowania nie można zwrócić ze względu na ochronę zdrowia lub ze względów higienicznych, jeżeli opakowanie zostało otwarte po dostarczeniu,</li>
                </ol>
              </li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 11 Reklamacja i gwarancja</h3>
            <ol>
              <li>Umową Sprzedaży objęte są Produkty nowe i używane.</li>
              <li>Sprzedawca jest obowiązany dostarczyć Klientowi rzecz wolną od wad.</li>
              <li>W przypadku wystąpienia wady zakupionego u Sprzedawcy towaru Klient ma prawo do reklamacji w oparciu o przepisy dotyczące rękojmi w kodeksie cywilnym.</li>
              <li>Reklamację należy zgłosić pisemnie lub drogą elektroniczną na podane w niniejszym Regulaminie adresy Sprzedawcy.</li>
              <li>Zaleca się, aby w reklamacji zawrzeć m.in. zwięzły opis wady, okoliczności (w tym datę) jej wystąpienia, dane Klienta składającego reklamację, oraz żądanie Klienta w związku z wadą towaru.</li>
              <li>Sprzedawca ustosunkuje się do żądania reklamacyjnego niezwłocznie, nie później niż w terminie 14 dni, a jeśli nie zrobi tego w tym terminie, uważa się, że żądanie Klienta uznał za uzasadnione.</li>
              <li>Towary odsyłane w ramach procedury reklamacyjnej należy wysyłać na adres podany w § 3 niniejszego Regulaminu.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 12 Pozasądowe sposoby rozpatrywania reklamacji i dochodzenia roszczeń</h3>
            <ol>
              <li>Szczegółowe informacje dotyczące możliwości skorzystania przez Konsumenta z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń oraz zasady dostępu do tych procedur dostępne są w siedzibach oraz na stronach internetowych powiatowych (miejskich) rzeczników konsumentów, organizacji społecznych, do których zadań statutowych należy ochrona konsumentów, Wojewódzkich Inspektoratów Inspekcji Handlowej oraz pod następującymi adresami internetowymi Urzędu Ochrony Konkurencji i Konsumentów: http://www.uokik.gov.pl/spory_konsumenckie.php; http://www.uokik.gov.pl/sprawy_indywidualne.php oraz http://www.uokik.gov.pl/wazne_adresy.php.</li>
              <li>Konsument posiada następujące przykładowe możliwości skorzystania z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń:
                <ol type="a">
                  <li>Konsument uprawniony jest do zwrócenia się do stałego polubownego sądu konsumenckiego, o którym mowa w art. 37 ustawy z dnia 15 grudnia 2000 r. o Inspekcji Handlowej (Dz.U. z 2014 r. poz. 148 z późn. zm.), z wnioskiem o rozstrzygnięcie sporu wynikłego z Umowy zawartej ze Sprzedawcą.</li>
                  <li>Konsument uprawniony jest do zwrócenia się do wojewódzkiego inspektora Inspekcji Handlowej, zgodnie z art. 36 ustawy z dnia 15 grudnia 2000 r. o Inspekcji Handlowej (Dz.U. z 2014 r. poz. 148 z późn. zm.), z wnioskiem o wszczęcie postępowania mediacyjnego w sprawie polubownego zakończenia sporu między Konsumentem a Sprzedawcą.</li>
                  <li>Konsument może uzyskać bezpłatną pomoc w sprawie rozstrzygnięcia sporu między nim a Sprzedawcą, korzystając także z bezpłatnej pomocy powiatowego (miejskiego) rzecznika konsumentów lub organizacji społecznej, do której zadań statutowych należy ochrona konsumentów (m.in. Federacja Konsumentów, Stowarzyszenie Konsumentów Polskich).</li>
                </ol>
              </li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 13 Dane osobowe w Sklepie internetowym</h3>
            <ol>
              <li>Administratorem danych osobowych Klientów zbieranych za pośrednictwem Sklepu internetowego jest Sprzedawca.</li>
              <li>Dane osobowe Klientów zbierane przez administratora za pośrednictwem Sklepu internetowego zbierane są w celu realizacji Umowy Sprzedaży, a jeżeli Klient wyrazi na to zgodę – także w celu marketingowym.</li>
              <li>Odbiorcami danych osobowych Klientów Sklepu internetowego mogą być:
                <ol type="a">
                  <li>W przypadku Klienta, który korzysta w Sklepie internetowym ze sposobu dostawy przesyłką pocztową lub przesyłką kurierską, Administrator udostępnia zebrane dane osobowe Klienta wybranemu przewoźnikowi lub pośrednikowi realizującemu przesyłki na zlecenie Administratora.</li>
                  <li>W przypadku Klienta, który korzysta w Sklepie internetowym ze sposobu płatności elektronicznych lub kartą płatniczą Administrator udostępnia zebrane dane osobowe Klienta, wybranemu podmiotowi obsługującemu powyższe płatności w Sklepie internetowym.</li>
                </ol>
              </li>
              <li>Klient ma prawo dostępu do treści swoich danych oraz ich poprawiania.</li>
              <li>Podanie danych osobowych jest dobrowolne, aczkolwiek niepodanie wskazanych w Regulaminie danych osobowych niezbędnych do zawarcia Umowy Sprzedaży skutkuje brakiem możliwości zawarcia tejże umowy.</li>
            </ol>

            <h3 className="text-xl font-bold mt-8 mb-4">§ 14 Postanowienia końcowe</h3>
            <ol>
              <li>Umowy zawierane poprzez Sklep internetowy zawierane są w języku polskim.</li>
              <li>Sprzedawca zastrzega sobie prawo do dokonywania zmian Regulaminu z ważnych przyczyn to jest: zmiany przepisów prawa, zmiany sposobów płatności i dostaw – w zakresie, w jakim te zmiany wpływają na realizację postanowień niniejszego Regulaminu. O każdej zmianie Sprzedawca poinformuje Klienta z co najmniej 7 dniowym wyprzedzeniem.</li>
              <li>W sprawach nieuregulowanych w niniejszym Regulaminie mają zastosowanie powszechnie obowiązujące przepisy prawa polskiego, w szczególności: Kodeksu cywilnego; ustawy o świadczeniu usług drogą elektroniczną; ustawy o prawach konsumenta, ustawy o ochronie danych osobowych.</li>
              <li>Klient ma prawo skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń. W tym celu może złożyć skargę za pośrednictwem unijnej platformy internetowej ODR dostępnej pod adresem: http://ec.europa.eu/consumers/odr/.</li>
            </ol>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-center font-medium">
                W sytuacji jakichkolwiek problemów z zamówieniem, w pierwszej kolejności zawsze zachęcamy do kontaktu z nami, abyśmy mogli jak najszybciej rozwiązać problem.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Terms;

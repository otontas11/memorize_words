import { capitalizeTr, realizeSentence, sentenceView } from './inflect.js'

const PAIRS = `
büyük|big|big
erkek çocuk|boy|boy
kantin|canteen|kentin
alkışlamak|clap|klep
sınıf|classroom|klasrum
gün|day|dey
affedersiniz|excuse me|ikskyuz mi
iyi|fine|fayn
bitirmek|finish|finiş
Cuma|Friday|fraydey
arkadaş|friend|frend
bahçe|garden|gardın
kız çocuk|girl|görl
erkek okul müdürü|headmaster|hedmastır
kadın okul müdürü|headmistress|hedmistrıs
merhaba|hello|helo
selam|hi|hay
nasıl|how|hav
zıplamak|jump|camp
çocuk|kid|kid
kütüphane|library|laybreri
yemekhane|lunch hall|lanç hol
tanışmak|meet|miit
Pazartesi|Monday|mandey
isim|name|neym
insanlar|people|piipıl
yer|place|pleys
oyun alanı|playground|pleygraund
öğrenci|pupil|pyupıl
Cumartesi|Saturday|satırdey
okul|school|skuul
şarkı söylemek|sing|sing
spor salonu|sports hall|sports hol
başlamak|start|start
Pazar|Sunday|sandey
öğretmen|teacher|tiiçır
öğretmenler odası|teacher's room|tiiçırz rum
teşekkür ederim|thank you|tenk yu
Perşembe|Thursday|törzdey
bugün|today|tudey
birlikte|together|tıgedır
Salı|Tuesday|tuuzdey
beklemek|wait|veyt
Çarşamba|Wednesday|venzdey
hafta|week|viik
ne|what|vat
nerede|where|ver
kim|who|huu
çanta|bag|beg
siyah|black|blek
kara tahta|blackboard|blekbord
mavi|blue|bluu
tahta|board|bord
kitap|book|buk
kitaplık|bookcase|bukkeys
kutu|box|boks
teneffüs|break|breyk
kahverengi|brown|braun
şapka|cap / hat|kep / het
kedi|cat|ket
sandalye|chair|çer
tebeşir|chalk|çok
duvar saati|clock|klok
kapatmak|close|kloz
renk / boyamak|colour|kalır
gelmek|come|kam
bilgisayar|computer|kompyutır
pastel boya|crayon|kreyın
koyu renk|dark|dark
sıra|desk|desk
kapı|door|dor
resim çizmek|draw|droo
yapıştırıcı|glue|gluu
yeşil|green|griin
yardım|help|help
dinlemek|listen|lisın
bakmak|look|luk
ihtiyaç duymak|need|niid
defter|notebook|noutbuk
nesne|object|obcekt
açmak|open|oupın
turuncu|orange|orınc
uzatmak|pass|pas
kurşun kalem|pencil|pensıl
kalem kutusu|pencil case|pensıl keys
resim|picture|pikçır
pembe|pink|pink
lütfen|please|pliiz
işaret etmek|point|point
mor|purple|pörpıl
koymak|put|put
sessiz|quiet|kuayıt
el kaldırmak|raise|reyz
hazır|ready|redi
kırmızı|red|red
tekrar etmek|repeat|ripiit
silgi|rubber|rabır
söylemek|say|sey
makas|scissors|sizırz
kalemtıraş|sharpener|şarpınır
göstermek|show|şou
oturmak|sit down|sit daun
akıllı tahta|Smart Board|smart bord
masa|table|teybıl
zaman|time|taym
duvar|wall|vol
aferin|well done|vel dan
beyaz|white|vayt
beyaz tahta|whiteboard|vaytbord
pencere|window|vindou
sarı|yellow|yelou
kol|arm|arm
doğum günü|birthday|börthdey
sarışın (erkek için)|blond|blond
sarışın (kadın için)|blonde|blond
vücut|body|badi
teneffüs zamanı|break time|breyk taym
pasta|cake|keyk
neşelenmek|cheer up|çiır ap
giysi / kumaş|cloth|kloth
mont|coat|kout
soğuk|cold|kould
karanlık|dark|dark
sevgili|dear|diır
elbise|dress|dres
kulak|ear|iır
göz|eye|ay
yüz|face|feys
hediye|gift|gift
gözlük|glasses|glasız
eldiven|gloves|glavz
harika|great|greyt
saç|hair|heır
el|hand|hend
kafa|head|hed
sıcak|hot|hat
ceket|jacket|cekit
bacak|leg|leg
uzun|long|long
ağız|mouth|mauth
burun|nose|nouz
kukla|puppet|papıt
yağmur|rain|reyn
atkı|scarf|skarf
gömlek|shirt|şört
ayakkabı|shoes|şuuz
kısa|short|şort
küçük|small|smol
kar|snow|snou
uzun boylu|tall|tol
pantolon|trousers|trauzırz
tişört|T-shirt|tii şört
şemsiye|umbrella|ambrela
albüm|album|elbım
tamam|all right|ol rayt
bebek|baby|beybi
güzel|beautiful|byutıfıl
erkek kardeş|brother|bradır
baba|dad / father|ded / fadır
kız evlat|daughter|dotır
aile|family|femıli
büyükbaba|grandfather|grenfadır
büyükanne|grandmother|grenmadır
yakışıklı|handsome|hensım
aç|hungry|hangri
sevimli|lovely|lavli
öğle yemeği|lunch|lanç
öğle yemeği zamanı|lunchtime|lançtaym
anne|mother / mum|madır / mam
hoş, güzel|nice|nays
fotoğraf|photo|foutou
kız kardeş|sister|sistır
erkek evlat|son|san
üzgün / özür dilerim|sorry|sori
çok|very|veri
balkon|balcony|belkıni
banyo|bathroom|bathrum
gaga|beak|biik
yatak|bed|bed
yatak odası|bedroom|bedrum
kuş|bird|börd
pençe|claw|klo
sehpa|coffee table|kofi teybıl
salatalık|cucumber|kyukambır
dans etmek|dance|dens
yemek odası|dining room|dayning rum
köpek|dog|dog
kapı zili|doorbell|dorbel
oyuncak bebek evi|dollhouse|dolhaus
bulmak|find|faynd
komik|funny|fani
japon balığı|goldfish|gouldfiş
mutlu|happy|hepi
ev|house|haus
mutfak|kitchen|kiçın
pati|paw|po
evcil hayvan|pet|pet
tavşan|rabbit|rebit
oda|room|rum
oturma odası|sitting room|siting rum
kanepe|sofa|soufa
kuyruk|tail|teyl
hayvan bıyıkları|whiskers|viskırz
elma|apple|epıl
muz|banana|bınana
fasulye|bean|biin
ekmek|bread|bred
kahvaltı|breakfast|brekfıst
brokoli|broccoli|brokıli
havuç|carrot|kerıt
karnabahar|cauliflower|koliflauır
kiraz|cherry|çeri
tavuk|chicken|çikın
kahve|coffee|kofi
kabak|courgette|kurjet
lezzetli|delicious|dilişıs
akşam yemeği|dinner|dinır
içecek / içmek|drink|drink
yumurta|egg|eg
balık|fish|fiş
meyve|fruit|fruut
sarımsak|garlic|garlik
üzüm|grape|greyp
marul|lettuce|letıs
et|meat|miit
süt|milk|milk
portakal|orange|orınc
armut|pear|per
biber|pepper|pepır
patates|potato|pıteytou
ıspanak|spinach|spinıç
çilek|strawberry|strobıri
çay|tea|tii
susamış|thirsty|törsti
domates|tomato|tımatou
sebze|vegetable|vecıtıbıl
su|water|votır
nefis|yummy|yami
`

const SENTENCE_LINES = `
erkek çocuk|Bir ___ var.|There is a boy.
kantin|Bir ___ var.|There is a canteen.
sınıf|Bir ___ var.|There is a classroom.
gün|Bir ___ var.|There is a day.
arkadaş|Benim bir ___ var.|I have a friend.
bahçe|Bir ___ var.|There is a garden.
kız çocuk|Bir ___ var.|There is a girl.
erkek okul müdürü|Bir ___ var.|There is a headmaster.
kadın okul müdürü|Bir ___ var.|There is a headmistress.
çocuk|Bir ___ var.|There is a kid.
kütüphane|Bir ___ var.|There is a library.
yemekhane|Bir ___ var.|There is a lunch hall.
isim|Benim bir ___ var.|I have a name.
insanlar|___ var.|There are people.
yer|Bir ___ var.|There is a place.
oyun alanı|Bir ___ var.|There is a playground.
öğrenci|Bir ___ var.|There is a pupil.
okul|Bir ___ var.|There is a school.
spor salonu|Bir ___ var.|There is a sports hall.
öğretmen|Benim bir ___ var.|I have a teacher.
öğretmenler odası|Bir ___ var.|There is a teacher's room.
hafta|Benim bir ___ var.|I have a week.
çanta|Benim bir ___ var.|I have a bag.
kara tahta|Bir ___ var.|There is a blackboard.
tahta|Bir ___ var.|There is a board.
kitap|Benim bir ___ var.|I have a book.
kitaplık|Bir ___ var.|There is a bookcase.
kutu|Bir ___ var.|There is a box.
teneffüs|Bir ___ var.|There is a break.
kedi|Bir ___ var.|There is a cat.
sandalye|Bir ___ var.|There is a chair.
duvar saati|Bir ___ var.|There is a clock.
bilgisayar|Benim bir ___ var.|I have a computer.
pastel boya|Onun bir ___ var.|She has a crayon.
sıra|Bir ___ var.|There is a desk.
kapı|Bir ___ var.|There is a door.
defter|Benim bir ___ var.|I have a notebook.
nesne|Bir ___ var.|There is an object.
kurşun kalem|Onun bir ___ var.|She has a pencil.
kalem kutusu|Benim bir ___ var.|I have a pencil case.
resim|Bir ___ var.|There is a picture.
silgi|Onun bir ___ var.|He has a rubber.
makas|___ var.|There are scissors.
kalemtıraş|Benim bir ___ var.|I have a sharpener.
akıllı tahta|Bir ___ var.|There is a Smart Board.
masa|Bir ___ var.|There is a table.
duvar|Bir ___ var.|There is a wall.
beyaz tahta|Bir ___ var.|There is a whiteboard.
pencere|Bir ___ var.|There is a window.
kol|Onun bir ___ var.|He has an arm.
doğum günü|Benim bir ___ var.|I have a birthday.
vücut|Bir ___ var.|There is a body.
pasta|Bir ___ var.|There is a cake.
mont|Onun bir ___ var.|He has a coat.
elbise|Onun bir ___ var.|She has a dress.
kulak|Onun bir ___ var.|She has an ear.
göz|Onun bir ___ var.|He has an eye.
yüz|Onun bir ___ var.|She has a face.
hediye|Benim bir ___ var.|I have a gift.
gözlük|___ var.|There are glasses.
eldiven|___ var.|There are gloves.
el|Onun bir ___ var.|She has a hand.
kafa|Onun bir ___ var.|He has a head.
ceket|Benim bir ___ var.|I have a jacket.
bacak|Onun bir ___ var.|He has a leg.
ağız|Onun bir ___ var.|She has a mouth.
burun|Onun bir ___ var.|He has a nose.
kukla|Bir ___ var.|There is a puppet.
atkı|Onun bir ___ var.|She has a scarf.
gömlek|Onun bir ___ var.|He has a shirt.
ayakkabı|___ var.|There are shoes.
pantolon|___ var.|There are trousers.
tişört|Benim bir ___ var.|I have a T-shirt.
şemsiye|Onun bir ___ var.|She has an umbrella.
albüm|Benim bir ___ var.|I have an album.
bebek|Bir ___ var.|There is a baby.
erkek kardeş|Benim bir ___ var.|I have a brother.
kız evlat|Onun bir ___ var.|She has a daughter.
aile|Benim bir ___ var.|I have a family.
büyükbaba|Benim bir ___ var.|I have a grandfather.
büyükanne|Onun bir ___ var.|She has a grandmother.
öğle yemeği|Bir ___ var.|There is a lunch.
fotoğraf|Benim bir ___ var.|I have a photo.
kız kardeş|Onun bir ___ var.|He has a sister.
erkek evlat|Onun bir ___ var.|She has a son.
balkon|Bir ___ var.|There is a balcony.
banyo|Bir ___ var.|There is a bathroom.
gaga|Onun bir ___ var.|He has a beak.
yatak|Bir ___ var.|There is a bed.
yatak odası|Bir ___ var.|There is a bedroom.
kuş|Bir ___ var.|There is a bird.
pençe|Bir ___ var.|There is a claw.
sehpa|Bir ___ var.|There is a coffee table.
salatalık|Bir ___ var.|There is a cucumber.
yemek odası|Bir ___ var.|There is a dining room.
köpek|Bir ___ var.|There is a dog.
kapı zili|Bir ___ var.|There is a doorbell.
oyuncak bebek evi|Bir ___ var.|There is a dollhouse.
japon balığı|Bir ___ var.|There is a goldfish.
ev|Benim bir ___ var.|I have a house.
mutfak|Bir ___ var.|There is a kitchen.
pati|Onun bir ___ var.|He has a paw.
evcil hayvan|Benim bir ___ var.|I have a pet.
tavşan|Bir ___ var.|There is a rabbit.
oda|Bir ___ var.|There is a room.
oturma odası|Bir ___ var.|There is a sitting room.
kanepe|Bir ___ var.|There is a sofa.
kuyruk|Onun bir ___ var.|She has a tail.
hayvan bıyıkları|___ var.|There are whiskers.
elma|Bir ___ var.|There is an apple.
muz|Benim bir ___ var.|I have a banana.
fasulye|Bir ___ var.|There is a bean.
kahvaltı|Bir ___ var.|There is a breakfast.
havuç|Onun bir ___ var.|She has a carrot.
karnabahar|Bir ___ var.|There is a cauliflower.
kiraz|Onun bir ___ var.|He has a cherry.
tavuk|Bir ___ var.|There is a chicken.
kahve|Benim bir ___ var.|I have a coffee.
kabak|Bir ___ var.|There is a courgette.
akşam yemeği|Bir ___ var.|There is a dinner.
yumurta|Onun bir ___ var.|She has an egg.
balık|Bir ___ var.|There is a fish.
üzüm|Benim bir ___ var.|I have a grape.
portakal|Bir ___ var.|There is an orange.
armut|Onun bir ___ var.|He has a pear.
biber|Bir ___ var.|There is a pepper.
patates|Benim bir ___ var.|I have a potato.
çilek|Onun bir ___ var.|She has a strawberry.
çay|Bir ___ var.|There is a tea.
domates|Onun bir ___ var.|He has a tomato.
sebze|Bir ___ var.|There is a vegetable.
`

function articleOk(sentence) {
  const pattern = /\b(a|an)\s+([A-Za-z][A-Za-z'-]*)/gi
  let match = pattern.exec(sentence)
  while (match) {
    const article = match[1].toLowerCase()
    const word = match[2]
    const needsAn = /^(?:hour|honest|honour|heir)/i.test(word)
      || (/^[aeiou]/i.test(word) && !/^(?:uni|use|one|eu)/i.test(word))
    if (needsAn ? article !== 'an' : article !== 'a') return false
    match = pattern.exec(sentence)
  }
  return true
}

function englishAgrees(frame, en) {
  if (!en || !articleOk(en)) return false
  if (frame.startsWith('Benim ')) return en.startsWith('I have ')
  if (frame.startsWith('Onun ')) return en.startsWith('He has ') || en.startsWith('She has ')
  if (frame.startsWith('Bir ')) return en.startsWith('There is ')
  if (frame.startsWith('___')) return en.startsWith('There are ')
  return false
}

function sameTr(left, right) {
  return String(left || '').toLocaleLowerCase('tr') === String(right || '').toLocaleLowerCase('tr')
}

export const FRAMES = Object.fromEntries(
  SENTENCE_LINES.trim().split('\n').filter(Boolean).map((line) => {
    const [word, tr, en] = line.split('|')
    return [word, [tr, en]]
  }),
)

export const SENTENCES = Object.fromEntries(
  Object.entries(FRAMES).flatMap(([word, [frame, en]]) => {
    const spoken = realizeSentence(frame, word)
    const view = spoken && sentenceView(spoken, word)
    if (!spoken || !view || view.spoken !== spoken || !view.token) return []
    if (!englishAgrees(frame, en)) return []
    if ((frame.startsWith('Benim ') || frame.startsWith('Onun ')) && sameTr(view.token, word)) return []
    return [[word, [spoken, en]]]
  }),
)

export function naiveFills(frame, noun) {
  const fills = [frame, frame.replace('___', noun)]
  if (frame.startsWith('___')) fills.push(frame.replace('___', capitalizeTr(noun)))
  return fills
}

export function bundledSentencePatch(turkish, c, ce) {
  const frame = FRAMES[turkish]
  if (!frame) return null
  const desired = SENTENCES[turkish]
  const desiredC = desired ? desired[0] : ''
  const desiredCe = desired ? desired[1] || '' : ''
  const currentC = c || ''
  const currentCe = ce || ''
  if (currentC === desiredC && currentCe === desiredCe) return null
  const owned = !currentC
    || currentC === desiredC
    || naiveFills(frame[0], turkish).some((item) => sameTr(item, currentC))
  if (!owned) return null
  return { c: desiredC, ce: desiredCe }
}

export { sentenceView }

export function defaultWords() {
  return PAIRS.trim().split('\n').map((line) => {
    const [t, e, p] = line.split('|')
    return { t, e, p, s: 0, L: 0 }
  })
}

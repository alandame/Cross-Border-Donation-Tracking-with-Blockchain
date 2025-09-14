(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-AMOUNT u101)
(define-constant ERR-INVALID-DURATION u102)
(define-constant ERR-INVALID-PENALTY u103)
(define-constant ERR-INVALID-THRESHOLD u104)
(define-constant ERR-ESCROW-ALREADY-EXISTS u105)
(define-constant ERR-ESCROW-NOT-FOUND u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-AUTHORITY-NOT-SET u108)
(define-constant ERR-INVALID-MIN-AMOUNT u109)
(define-constant ERR-INVALID-MAX-AMOUNT u110)
(define-constant ERR-UPDATE-NOT-ALLOWED u111)
(define-constant ERR-INVALID-UPDATE-PARAM u112)
(define-constant ERR-MAX-ESCROWS-EXCEEDED u113)
(define-constant ERR-INVALID-ESCROW-TYPE u114)
(define-constant ERR-INVALID-INTEREST u115)
(define-constant ERR-INVALID-GRACE u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-RECIPIENT u120)
(define-constant ERR-INVALID-CONDITION u121)
(define-constant ERR-INVALID-RELEASE-TIME u122)
(define-constant ERR-INVALID-REFUND-TIME u123)
(define-constant ERR-INVALID-ARBITER u124)
(define-constant ERR-INVALID-FEE u125)

(define-data-var next-escrow-id uint u0)
(define-data-var max-escrows uint u1000)
(define-data-var escrow-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map escrows
  uint
  {
    donor: principal,
    recipient: principal,
    amount: uint,
    duration: uint,
    penalty: uint,
    threshold: uint,
    timestamp: uint,
    escrow-type: (string-utf8 50),
    interest: uint,
    grace: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: (string-utf8 20),
    min-amount: uint,
    max-amount: uint,
    condition: (string-utf8 200),
    release-time: uint,
    refund-time: uint,
    arbiter: principal,
    fee-paid: bool
  }
)

(define-map escrows-by-donor
  principal
  (list 50 uint))

(define-map escrow-updates
  uint
  {
    update-amount: uint,
    update-duration: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-escrow (id uint))
  (map-get? escrows id)
)

(define-read-only (get-escrow-updates (id uint))
  (map-get? escrow-updates id)
)

(define-read-only (get-escrows-for-donor (donor principal))
  (default-to (list) (map-get? escrows-by-donor donor))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-penalty (penalty uint))
  (if (<= penalty u100)
      (ok true)
      (err ERR-INVALID-PENALTY))
)

(define-private (validate-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-escrow-type (type (string-utf8 50)))
  (if (or (is-eq type "donation") (is-eq type "charity") (is-eq type "aid"))
      (ok true)
      (err ERR-INVALID-ESCROW-TYPE))
)

(define-private (validate-interest (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-INTEREST))
)

(define-private (validate-grace (period uint))
  (if (<= period u30)
      (ok true)
      (err ERR-INVALID-GRACE))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-amount (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-AMOUNT))
)

(define-private (validate-max-amount (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-AMOUNT))
)

(define-private (validate-recipient (rec principal))
  (if (not (is-eq rec tx-sender))
      (ok true)
      (err ERR-INVALID-RECIPIENT))
)

(define-private (validate-condition (cond (string-utf8 200)))
  (if (and (> (len cond) u0) (<= (len cond) u200))
      (ok true)
      (err ERR-INVALID-CONDITION))
)

(define-private (validate-release-time (time uint))
  (if (> time block-height)
      (ok true)
      (err ERR-INVALID-RELEASE-TIME))
)

(define-private (validate-refund-time (time uint))
  (if (> time block-height)
      (ok true)
      (err ERR-INVALID-REFUND-TIME))
)

(define-private (validate-arbiter (arb principal))
  (if (not (is-eq arb tx-sender))
      (ok true)
      (err ERR-INVALID-ARBITER))
)

(define-private (validate-fee (fee uint))
  (if (>= fee u0)
      (ok true)
      (err ERR-INVALID-FEE))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-escrows (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-ESCROWS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set max-escrows new-max)
    (ok true)
  )
)

(define-public (set-escrow-fee (new-fee uint))
  (begin
    (try! (validate-fee new-fee))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set escrow-fee new-fee)
    (ok true)
  )
)

(define-public (create-escrow
  (recipient principal)
  (amount uint)
  (duration uint)
  (penalty uint)
  (threshold uint)
  (escrow-type (string-utf8 50))
  (interest uint)
  (grace uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-amount uint)
  (max-amount uint)
  (condition (string-utf8 200))
  (release-time uint)
  (refund-time uint)
  (arbiter principal)
)
  (let (
        (next-id (var-get next-escrow-id))
        (current-max (var-get max-escrows))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-ESCROWS-EXCEEDED))
    (try! (validate-recipient recipient))
    (try! (validate-amount amount))
    (try! (validate-duration duration))
    (try! (validate-penalty penalty))
    (try! (validate-threshold threshold))
    (try! (validate-escrow-type escrow-type))
    (try! (validate-interest interest))
    (try! (validate-grace grace))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-amount min-amount))
    (try! (validate-max-amount max-amount))
    (try! (validate-condition condition))
    (try! (validate-release-time release-time))
    (try! (validate-refund-time refund-time))
    (try! (validate-arbiter arbiter))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-SET))))
      (try! (stx-transfer? (var-get escrow-fee) tx-sender authority-recipient))
    )
    (try! (as-contract (stx-transfer? amount tx-sender contract-caller)))
    (map-set escrows next-id
      {
        donor: tx-sender,
        recipient: recipient,
        amount: amount,
        duration: duration,
        penalty: penalty,
        threshold: threshold,
        timestamp: block-height,
        escrow-type: escrow-type,
        interest: interest,
        grace: grace,
        location: location,
        currency: currency,
        status: "locked",
        min-amount: min-amount,
        max-amount: max-amount,
        condition: condition,
        release-time: release-time,
        refund-time: refund-time,
        arbiter: arbiter,
        fee-paid: true
      }
    )
    (map-set escrows-by-donor tx-sender
      (unwrap! (as-some (append (get-escrows-for-donor tx-sender) next-id)) (err u999)))
    (var-set next-escrow-id (+ next-id u1))
    (print { event: "escrow-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-escrow
  (escrow-id uint)
  (update-amount uint)
  (update-duration uint)
)
  (let ((escrow (map-get? escrows escrow-id)))
    (match escrow
      e
        (begin
          (asserts! (is-eq (get donor e) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (is-eq (get status e) "locked") (err ERR-UPDATE-NOT-ALLOWED))
          (try! (validate-amount update-amount))
          (try! (validate-duration update-duration))
          (map-set escrows escrow-id
            (merge e
              {
                amount: update-amount,
                duration: update-duration,
                timestamp: block-height
              }
            )
          )
          (map-set escrow-updates escrow-id
            {
              update-amount: update-amount,
              update-duration: update-duration,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "escrow-updated", id: escrow-id })
          (ok true)
        )
      (err ERR-ESCROW-NOT-FOUND)
    )
  )
)

(define-public (release-funds (escrow-id uint))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) (err ERR-ESCROW-NOT-FOUND))))
    (asserts! (or (is-eq tx-sender (get arbiter escrow)) (and (>= block-height (get release-time escrow)) (is-eq (get status escrow) "locked"))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status escrow) "locked") (err ERR-INVALID-STATUS))
    (try! (as-contract (stx-transfer? (get amount escrow) contract-caller (get recipient escrow))))
    (map-set escrows escrow-id (merge escrow { status: "released" }))
    (print { event: "funds-released", id: escrow-id })
    (ok true)
  )
)

(define-public (refund-funds (escrow-id uint))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) (err ERR-ESCROW-NOT-FOUND))))
    (asserts! (or (is-eq tx-sender (get arbiter escrow)) (and (>= block-height (get refund-time escrow)) (is-eq (get status escrow) "locked"))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status escrow) "locked") (err ERR-INVALID-STATUS))
    (try! (as-contract (stx-transfer? (get amount escrow) contract-caller (get donor escrow))))
    (map-set escrows escrow-id (merge escrow { status: "refunded" }))
    (print { event: "funds-refunded", id: escrow-id })
    (ok true)
  )
)

(define-public (get-escrow-count)
  (ok (var-get next-escrow-id))
)

(define-public (check-escrow-status (id uint))
  (match (map-get? escrows id)
    e (ok (get status e))
    (err ERR-ESCROW-NOT-FOUND))
)
module randomnessreporter

go 1.25.0

require (
	github.com/Trisia/randomness v0.0.0
	github.com/emmansun/gmsm v0.44.1
	github.com/sixafter/aes-ctr-drbg v1.14.5
)

replace github.com/Trisia/randomness => ./third_party/randomness

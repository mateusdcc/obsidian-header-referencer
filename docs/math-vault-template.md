# Math Vault Template (Example)

This is a practical example for organizing advanced math notes with Header Referencer.

## Suggested folder structure

```text
Math/
  Analysis/
    Compactness.md
    Functional Analysis.md
  Algebra/
    Group Theory.md
    Ring Theory.md
  Topology/
    Point Set Topology.md
  Exercises/
    Analysis Exercises.md
  Indexes/
    Theorems.md
    Definitions.md
```

## Example note pattern

```md
# Compactness

## Compactness Theorem
- Theorem: Every open cover has a finite subcover.
- Uses: Heine-Borel, open cover definitions
- Depends on: Topological space, subcover
- Generalizes: Finite dimensional closed-bounded compactness
- Proof status: review
\label{thm:compactness}

### Proof
- Proof: Use finite subcover extraction from open cover arguments.
- Proof status: draft

## Sequential Compactness
- Definition: Every sequence has a convergent subsequence.
- Uses: Bolzano-Weierstrass
\label{def:sequential-compactness}

## Equivalence in Metric Spaces
- Theorem: Compactness is equivalent to sequential compactness in metric spaces.
- Depends on: Compactness Theorem, Sequential Compactness
- Proof status: draft
\label{thm:compactness-equivalence}
```

## Recommended category set

- Definition (`Def`, `Def.`)
- Theorem (`Thm`, `Thm.`)
- Lemma
- Proposition (`Prop`, `Prop.`)
- Corollary
- Proof (`Pf`, `Pf.`)
- Example (`Ex`, `Ex.`)
- Counterexample (`Cex`)
- Remark (`Rem`, `Rem.`)
- Notation

## Recommended super categories

- `Statements`: Theorem, Lemma, Proposition, Corollary
- `Supporting Notes`: Definition, Notation, Remark, Example, Counterexample

## Study workflow (commands)

1. Write metadata while drafting notes.
2. Run `Header Referencer: Validate header metadata format`.
3. Run `Header Referencer: List proofs to finish`.
4. During revision, run `Header Referencer: Random theorem/definition`.
5. While writing a proof, run `Header Referencer: Show prerequisites for current header`.

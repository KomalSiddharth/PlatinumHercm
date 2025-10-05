import AddRitualForm from '../AddRitualForm';

export default function AddRitualFormExample() {
  return (
    <div className="p-8 max-w-2xl">
      <AddRitualForm
        onAdd={(ritual) => console.log('New ritual:', ritual)}
      />
    </div>
  );
}
